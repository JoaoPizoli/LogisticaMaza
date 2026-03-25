import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CarregamentoService } from './carregamento.service';
import { CreateCarregamentoDto } from './dto/create-carregamento.dto';
import { UpdateCarregamentoDto } from './dto/update-carregamento.dto';

@Controller('carregamento')
export class CarregamentoController {
    constructor(private readonly carregamentoService: CarregamentoService) {}

    @Post()
    create(@Body() createCarregamentoDto: CreateCarregamentoDto) {
        return this.carregamentoService.create(createCarregamentoDto);
    }

    @Get()
    findAll() {
        return this.carregamentoService.findAll();
    }

    // IMPORTANTE: declarado ANTES de :id para evitar conflito de rota
    @Get('montar')
    montar(
        @Query('rotaId') rotaId?: string,
        @Query('cidades') cidades?: string,
    ) {
        const rotaIdNum = rotaId ? parseInt(rotaId, 10) : undefined;
        const cidadeIds = cidades
            ? cidades.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id))
            : undefined;
        return this.carregamentoService.montarCarregamento(rotaIdNum, cidadeIds);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.carregamentoService.findOne(id);
    }

    @Patch('finalizar/:id')
    finalizar(@Param('id', ParseIntPipe) id: number) {
        return this.carregamentoService.finalizarCarregamento(id);
    }

    @Patch('enviar/:id')
    enviar(@Param('id', ParseIntPipe) id: number) {
        return this.carregamentoService.enviarParaMotorista(id);
    }

    @Patch('confirmar/:id')
    confirmar(@Param('id', ParseIntPipe) id: number) {
        return this.carregamentoService.confirmarOrdenacao(id);
    }

    @Patch('reenviar/:id')
    reenviar(@Param('id', ParseIntPipe) id: number) {
        return this.carregamentoService.reenviarParaMotorista(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateCarregamentoDto: UpdateCarregamentoDto) {
        return this.carregamentoService.update(id, updateCarregamentoDto);
    }

    @Post(':id/add-pedido')
    addPedido(@Param('id', ParseIntPipe) id: number, @Body('numdoc') numdoc: string) {
        return this.carregamentoService.addPedido(id, numdoc);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.carregamentoService.remove(id);
    }
}
