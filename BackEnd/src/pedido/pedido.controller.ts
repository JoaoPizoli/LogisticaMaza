import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { PedidoService } from './pedido.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';

@Controller('pedido')
export class PedidoController {
    constructor(private readonly pedidoService: PedidoService) {}

    @Post()
    create(@Body() createPedidoDto: CreatePedidoDto) {
        return this.pedidoService.create(createPedidoDto);
    }

    @Get()
    findAll(
        @Query('nomven') nomven?: string,
        @Query('data_inicio') dataInicio?: string,
        @Query('data_fim') dataFim?: string,
        @Query('cidade') cidade?: string,
        @Query('baixa_sistema') baixaSistema?: string,
        @Query('numdoc') numdoc?: string,
    ) {
        return this.pedidoService.findAll({ nomven, dataInicio, dataFim, cidade, baixaSistema, numdoc });
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.pedidoService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updatePedidoDto: UpdatePedidoDto) {
        return this.pedidoService.update(id, updatePedidoDto);
    }

    @Patch('baixa/:numdoc')
    baixaSistema(@Param('numdoc') numdoc: string) {
        return this.pedidoService.baixaSistema(numdoc);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.pedidoService.remove(id);
    }
}
