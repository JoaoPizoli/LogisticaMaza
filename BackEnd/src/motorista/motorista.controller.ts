import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { MotoristaService } from './motorista.service';
import { CreateMotoristaDto } from './dto/create-motorista.dto';
import { UpdateMotoristaDto } from './dto/update-motorista.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('motorista')
export class MotoristaController {
    constructor(private readonly motoristaService: MotoristaService) {}

    @Post()
    create(@Body() createMotoristaDto: CreateMotoristaDto) {
        return this.motoristaService.create(createMotoristaDto);
    }

    @Get()
    findAll() {
        return this.motoristaService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.motoristaService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateMotoristaDto: UpdateMotoristaDto) {
        return this.motoristaService.update(id, updateMotoristaDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.motoristaService.remove(id);
    }
}
