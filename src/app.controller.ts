import { Controller, Get, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Hello World!' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Hello World!',
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
