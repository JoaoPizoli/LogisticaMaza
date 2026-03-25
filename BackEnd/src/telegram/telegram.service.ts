import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Bot, InlineKeyboard, Context } from 'grammy';
import { MotoristaService } from '../motorista/motorista.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CarregamentoEntity, CidadeGrupo, PedidoOrdemItem } from '../carregamento/entities/carregamento.entity';
import { CidadeEntity } from '../cidade/entities/cidade.entity';

interface PedidoFlat {
    numdoc: string;
    nomcli: string;
    cidade_nome: string;
    peso_bruto: number;
    endent?: string;
}

interface ActiveOrder {
    carregamentoId: number;
    messageId: number;
    pedidos: PedidoFlat[];
    nome?: string;
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TelegramService.name);
    private bot: Bot | null = null;

    // Map chatId -> active order being reordered
    private activeOrders = new Map<string, ActiveOrder>();
    // Map chatId -> carregamentoId for chat mode
    private chatMode = new Map<string, number>();

    /**
     * Recovers an active order from the database when the in-memory map doesn't have it.
     * This handles bot restarts, or any situation where the in-memory state is lost.
     */
    private async recoverActiveOrder(chatId: string, messageId?: number): Promise<ActiveOrder | undefined> {
        const motorista = await this.motoristaService.findByChatId(chatId);
        if (!motorista) return undefined;

        const carregamento = await this.carregamentoRepository.findOne({
            where: { motorista_id: motorista.id, status: 'enviado' },
        });
        if (!carregamento) return undefined;

        const pedidos = await this.flattenPedidos(carregamento.cidades_em_ordem);
        const order: ActiveOrder = {
            carregamentoId: carregamento.id,
            messageId: messageId ?? 0,
            pedidos,
            nome: carregamento.nome,
        };
        this.activeOrders.set(chatId, order);
        return order;
    }

    constructor(
        private readonly configService: ConfigService,
        private readonly motoristaService: MotoristaService,
        private readonly chatGateway: ChatGateway,
        @InjectRepository(CarregamentoEntity)
        private readonly carregamentoRepository: Repository<CarregamentoEntity>,
        @InjectRepository(CidadeEntity)
        private readonly cidadeRepository: Repository<CidadeEntity>,
    ) {}

    async onModuleInit() {
        const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        if (!token) {
            this.logger.warn('TELEGRAM_BOT_TOKEN não configurado. Bot do Telegram desativado.');
            return;
        }

        this.bot = new Bot(token);
        this.registerHandlers();

        this.bot.start({
            onStart: () => this.logger.log('Bot do Telegram iniciado (long polling)'),
        });
    }

    async onModuleDestroy() {
        if (this.bot) {
            await this.bot.stop();
            this.logger.log('Bot do Telegram parado');
        }
    }

    private registerHandlers() {
        if (!this.bot) return;

        // /start <codigo> — Vinculação do motorista
        this.bot.command('start', async (ctx) => {
            const codigo = ctx.match?.trim();
            if (!codigo) {
                await ctx.reply(
                    '❌ Envie o comando com seu código de vinculação:\n' +
                    '/start SEU_CODIGO',
                );
                return;
            }

            const chatId = String(ctx.chat.id);
            const motorista = await this.motoristaService.vincularTelegram(codigo, chatId);

            if (!motorista) {
                await ctx.reply('❌ Código de vinculação inválido. Verifique com o operador.');
                return;
            }

            await ctx.reply(
                `✅ Vinculado com sucesso!\n\nOlá, ${motorista.nome}! Agora você receberá ordens de carregamento por aqui.`,
            );
        });

        // /contato — Solicita chat com operador
        this.bot.command('contato', async (ctx) => {
            const chatId = String(ctx.chat.id);
            const motorista = await this.motoristaService.findByChatId(chatId);
            if (!motorista) {
                await ctx.reply('❌ Você ainda não está vinculado. Use /start SEU_CODIGO');
                return;
            }

            const activeOrder = this.activeOrders.get(chatId)
                || await this.recoverActiveOrder(chatId);
            if (!activeOrder) {
                await ctx.reply('❌ Nenhum carregamento ativo no momento.');
                return;
            }

            this.chatMode.set(chatId, activeOrder.carregamentoId);
            this.chatGateway.emitChatRequest(activeOrder.carregamentoId, motorista.nome);

            const label = activeOrder.nome ?? `Carregamento #${activeOrder.carregamentoId}`;
            await ctx.reply(
                `💬 Modo conversa ativado para ${label}.\n\n` +
                'Envie suas mensagens normalmente. O operador será notificado.\n' +
                'Use /sair para voltar ao modo normal.',
            );
        });

        // /sair — Sai do modo chat
        this.bot.command('sair', async (ctx) => {
            const chatId = String(ctx.chat.id);
            if (this.chatMode.has(chatId)) {
                this.chatMode.delete(chatId);
                await ctx.reply('✅ Modo conversa encerrado.');
            } else {
                await ctx.reply('Você não está no modo conversa.');
            }
        });

        // Callback queries — reordering + confirm + chat
        this.bot.on('callback_query:data', async (ctx) => {
            const chatId = String(ctx.chat?.id);
            const data = ctx.callbackQuery.data;

            if (data === 'confirm') {
                await this.handleConfirm(ctx, chatId);
            } else if (data === 'chat') {
                await this.handleChatButton(ctx, chatId);
            } else if (data.startsWith('up:')) {
                const idx = parseInt(data.split(':')[1], 10);
                await this.handleMove(ctx, chatId, idx, 'up');
            } else if (data.startsWith('down:')) {
                const idx = parseInt(data.split(':')[1], 10);
                await this.handleMove(ctx, chatId, idx, 'down');
            }

            await ctx.answerCallbackQuery();
        });

        // Text messages — forward to chat if in chat mode
        this.bot.on('message:text', async (ctx) => {
            const chatId = String(ctx.chat.id);
            const carregamentoId = this.chatMode.get(chatId);

            if (carregamentoId) {
                await this.chatGateway.emitMensagemMotorista(
                    carregamentoId,
                    ctx.message.text,
                );
            }
        });
    }

    /**
     * Sends the loading order to the driver via Telegram with inline keyboard
     */
    async enviarOrdemCarregamento(carregamento: CarregamentoEntity, chatId: string) {
        if (!this.bot) {
            this.logger.warn('Bot não inicializado. Impossível enviar ordem.');
            return;
        }

        const pedidosFlat = await this.flattenPedidos(carregamento.cidades_em_ordem);

        const text = this.buildOrderText(carregamento.id, pedidosFlat, carregamento.nome);
        const keyboard = this.buildOrderKeyboard(pedidosFlat);

        const msg = await this.bot.api.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: keyboard,
        });

        this.activeOrders.set(chatId, {
            carregamentoId: carregamento.id,
            messageId: msg.message_id,
            pedidos: pedidosFlat,
            nome: carregamento.nome,
        });
    }

    /**
     * Re-sends the updated loading order to the driver.
     * Deletes the old message and sends a new one, so the driver only sees the latest order.
     * Clears any active chat mode for the driver.
     */
    async reenviarOrdemCarregamento(carregamento: CarregamentoEntity, chatId: string) {
        if (!this.bot) {
            this.logger.warn('Bot não inicializado. Impossível reenviar ordem.');
            return;
        }

        // Delete the old message if it exists
        const existingOrder = this.activeOrders.get(chatId);
        if (existingOrder && existingOrder.messageId) {
            try {
                await this.bot.api.deleteMessage(chatId, existingOrder.messageId);
            } catch (e) {
                this.logger.warn(`Não foi possível excluir mensagem antiga ${existingOrder.messageId}.`);
            }
        }

        // Send a new message with the updated order
        const pedidosFlat = await this.flattenPedidos(carregamento.cidades_em_ordem);
        const text = this.buildOrderText(carregamento.id, pedidosFlat, carregamento.nome);
        const keyboard = this.buildOrderKeyboard(pedidosFlat);

        const msg = await this.bot.api.sendMessage(chatId, text, {
            parse_mode: 'HTML',
            reply_markup: keyboard,
        });

        this.activeOrders.set(chatId, {
            carregamentoId: carregamento.id,
            messageId: msg.message_id,
            pedidos: pedidosFlat,
            nome: carregamento.nome,
        });

        // Clear chat mode if active
        this.chatMode.delete(chatId);
    }

    /**
     * Send a message to the driver's Telegram (from frontend user)
     */
    async enviarMensagemParaMotorista(chatId: string, texto: string) {
        if (!this.bot) return;
        await this.bot.api.sendMessage(chatId, `💬 Operador:\n${texto}`);
    }

    /**
     * Flatten all city groups into a single ordered list of pedidos.
     * Looks up endent (address) from each city's ordem_entrega by codcli.
     */
    private async flattenPedidos(cidadesEmOrdem: CidadeGrupo[]): Promise<PedidoFlat[]> {
        const result: PedidoFlat[] = [];
        const sorted = [...cidadesEmOrdem].sort((a, b) => a.ordem - b.ordem);

        // Load all cities at once to get their ordem_entrega
        const cidadeIds = sorted.map(c => c.cidade_id).filter(id => id > 0);
        const cidadeEntities = cidadeIds.length > 0
            ? await this.cidadeRepository.findByIds(cidadeIds)
            : [];
        const cidadeMap = new Map(cidadeEntities.map(c => [c.id, c]));

        for (const cidade of sorted) {
            const cidadeEntity = cidadeMap.get(cidade.cidade_id);
            const ordemEntrega = cidadeEntity?.ordem_entrega || [];

            const pedidos = [...cidade.pedidos].sort((a, b) => a.ordem - b.ordem);
            for (const p of pedidos) {
                // Always look up endent from the city's ordem_entrega by codcli
                let endent: string | undefined;
                if (p.codcli && ordemEntrega.length > 0) {
                    const match = ordemEntrega.find(oe => oe.codcli === p.codcli);
                    endent = match?.endent;
                }
                // Fallback to stored endent if codcli lookup failed
                if (!endent) {
                    endent = p.endent;
                }

                result.push({
                    numdoc: p.numdoc,
                    nomcli: p.nomcli,
                    cidade_nome: cidade.cidade_nome,
                    peso_bruto: p.peso_bruto,
                    endent,
                });
            }
        }

        return result;
    }

    private buildOrderText(carregamentoId: number, pedidos: PedidoFlat[], nome?: string): string {
        const pesoTotal = pedidos.reduce((sum, p) => sum + p.peso_bruto, 0);
        const label = nome ?? `Carregamento #${carregamentoId}`;
        let text = `📦 <b>${label}</b>\n`;
        text += `<b>Ordem de Carregamento</b>\n`;
        text += `⚖️ Peso total: <b>${pesoTotal.toFixed(2).replace('.', ',')} kg</b>\n\n`;

        pedidos.forEach((p, idx) => {
            const peso = p.peso_bruto.toFixed(2).replace('.', ',');
            const nomcli = p.nomcli.length > 25 ? p.nomcli.substring(0, 25) + '…' : p.nomcli;
            let line = `<b>${idx + 1}.</b> ${p.numdoc} | ${nomcli}`;
            if (p.endent) {
                const addr = p.endent.length > 30 ? p.endent.substring(0, 30) + '…' : p.endent;
                line += ` | 📍 ${addr}`;
            }
            line += ` | ${p.cidade_nome} | ${peso} kg`;
            text += line + '\n';
        });

        text += `\n⬆️⬇️ Use os botões para reordenar\n✅ Confirme quando estiver pronto`;

        return text;
    }

    private buildOrderKeyboard(pedidos: PedidoFlat[]): InlineKeyboard {
        const keyboard = new InlineKeyboard();

        pedidos.forEach((p, idx) => {
            const label = `${idx + 1}. ${p.nomcli.substring(0, 20)}`;

            if (idx > 0) {
                keyboard.text('⬆️', `up:${idx}`);
            } else {
                keyboard.text('  ', `noop`);
            }

            keyboard.text(label, `noop`);

            if (idx < pedidos.length - 1) {
                keyboard.text('⬇️', `down:${idx}`);
            } else {
                keyboard.text('  ', `noop`);
            }

            keyboard.row();
        });

        keyboard.row();
        keyboard.text('✅ Confirmar Ordem', 'confirm');
        keyboard.text('💬 Falar com Operador', 'chat');

        return keyboard;
    }

    private async handleMove(ctx: Context, chatId: string, idx: number, direction: 'up' | 'down') {
        let order = this.activeOrders.get(chatId);
        if (!order) {
            order = await this.recoverActiveOrder(chatId, ctx.callbackQuery?.message?.message_id);
            if (!order) return;
        }

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= order.pedidos.length) return;

        // Swap
        [order.pedidos[idx], order.pedidos[swapIdx]] = [order.pedidos[swapIdx], order.pedidos[idx]];

        // Edit the message with updated order
        const text = this.buildOrderText(order.carregamentoId, order.pedidos, order.nome);
        const keyboard = this.buildOrderKeyboard(order.pedidos);

        try {
            await ctx.editMessageText(text, {
                parse_mode: 'HTML',
                reply_markup: keyboard,
            });
        } catch (e) {
            // Message might not have changed (duplicate edits)
        }
    }

    private async handleConfirm(ctx: Context, chatId: string) {
        let order = this.activeOrders.get(chatId);
        if (!order) {
            order = await this.recoverActiveOrder(chatId, ctx.callbackQuery?.message?.message_id);
            if (!order) {
                await ctx.answerCallbackQuery({ text: 'Nenhum carregamento ativo.' });
                return;
            }
        }

        // Update carregamento directly in the database
        const carregamento = await this.carregamentoRepository.findOneBy({ id: order.carregamentoId });
        if (carregamento && carregamento.status === 'enviado') {
            const newCidades = this.rebuildCidadesFromFlatOrder(carregamento.cidades_em_ordem, order.pedidos);
            carregamento.cidades_em_ordem = newCidades;
            carregamento.status = 'ordenado';
            await this.carregamentoRepository.save(carregamento);
        }

        const motorista = await this.motoristaService.findByChatId(chatId);

        // Notify frontend via WebSocket
        this.chatGateway.emitStatusUpdate(order.carregamentoId, 'ordenado', motorista?.nome, order.nome);

        // Clean up
        this.activeOrders.delete(chatId);
        this.chatMode.delete(chatId);

        const label = order.nome ?? `Carregamento #${order.carregamentoId}`;
        await ctx.editMessageText(
            `✅ <b>Ordem Confirmada!</b>\n\n` +
            `${label} - Ordem de carregamento confirmada.\n` +
            `O operador será notificado.`,
            { parse_mode: 'HTML' },
        );
    }

    /**
     * Rebuilds `cidades_em_ordem` from the flat confirmed order.
     */
    private rebuildCidadesFromFlatOrder(
        originalCidades: CidadeGrupo[],
        flatOrder: PedidoFlat[],
    ): CidadeGrupo[] {
        // Build lookups for itens and endent from original data so they are preserved
        const itensMap = new Map<string, PedidoOrdemItem['itens']>();
        const endentMap = new Map<string, string>();
        for (const cidade of originalCidades) {
            for (const p of cidade.pedidos) {
                if (p.itens && p.itens.length > 0) {
                    itensMap.set(p.numdoc, p.itens);
                }
                if (p.endent) {
                    endentMap.set(p.numdoc, p.endent);
                }
            }
        }

        const cidadeMap = new Map<string, PedidoOrdemItem[]>();
        let globalOrdem = 1;

        for (const item of flatOrder) {
            const key = item.cidade_nome;
            if (!cidadeMap.has(key)) {
                cidadeMap.set(key, []);
            }
            cidadeMap.get(key)!.push({
                numdoc: item.numdoc,
                ordem: globalOrdem++,
                nomcli: item.nomcli,
                peso_bruto: item.peso_bruto,
                itens: itensMap.get(item.numdoc),
                endent: endentMap.get(item.numdoc),
            });
        }

        const result: CidadeGrupo[] = [];
        let cidadeOrdem = 1;

        const seenCities = new Set<string>();
        for (const item of flatOrder) {
            if (seenCities.has(item.cidade_nome)) continue;
            seenCities.add(item.cidade_nome);

            const original = originalCidades.find(c => c.cidade_nome === item.cidade_nome);
            const pedidos = cidadeMap.get(item.cidade_nome) || [];

            pedidos.forEach((p, idx) => { p.ordem = idx + 1; });

            result.push({
                cidade_id: original?.cidade_id || 0,
                cidade_nome: item.cidade_nome,
                ordem: cidadeOrdem++,
                pedidos,
            });
        }

        return result;
    }

    private async handleChatButton(ctx: Context, chatId: string) {
        let order = this.activeOrders.get(chatId);
        if (!order) {
            order = await this.recoverActiveOrder(chatId, ctx.callbackQuery?.message?.message_id);
            if (!order) return;
        }

        const motorista = await this.motoristaService.findByChatId(chatId);
        if (!motorista) return;

        this.chatMode.set(chatId, order.carregamentoId);

        this.chatGateway.emitChatRequest(order.carregamentoId, motorista.nome);

        const label = order.nome ?? `Carregamento #${order.carregamentoId}`;
        await ctx.answerCallbackQuery({ text: 'Modo conversa ativado!' });
        await this.bot?.api.sendMessage(
            chatId,
            `💬 Modo conversa ativado para ${label}.\n\n` +
            'Envie suas mensagens normalmente. O operador será notificado.\n' +
            'Use /sair para voltar ao modo normal.',
        );
    }

    // Removed: confirmed orders are now stored directly in the database
}
