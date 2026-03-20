import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { RotaService } from './rota.service';
import { CreateRotaDto } from './dto/create-rota.dto';
import { UpdateRotaDto } from './dto/update-rota.dto';

@Controller('rota')
export class RotaController {
    constructor(private readonly rotaService: RotaService) {}

    @Post()
    create(@Body() createRotaDto: CreateRotaDto) {
        return this.rotaService.create(createRotaDto);
    }

    @Get()
    findAll() {
        return this.rotaService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.rotaService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateRotaDto: UpdateRotaDto) {
        return this.rotaService.update(id, updateRotaDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.rotaService.remove(id);
    }
}
