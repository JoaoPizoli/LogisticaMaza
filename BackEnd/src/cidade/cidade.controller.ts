import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CidadesService } from './cidades.service';
import { CreateCidadeDto } from './dto/create-cidade.dto';
import { UpdateCidadeDto } from './dto/update-cidade.dto';

@Controller('cidade')
export class CidadeController {
    constructor(private readonly cidadesService: CidadesService) {}

    @Post()
    create(@Body() createCidadeDto: CreateCidadeDto) {
        return this.cidadesService.create(createCidadeDto);
    }

    @Get()
    findAll() {
        return this.cidadesService.findAll();
    }

    @Get('nomes')
    findAllNomes() {
        return this.cidadesService.findAllNomes();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.cidadesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateCidadeDto: UpdateCidadeDto) {
        return this.cidadesService.update(id, updateCidadeDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.cidadesService.remove(id);
    }
}
