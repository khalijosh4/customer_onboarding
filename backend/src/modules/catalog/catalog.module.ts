import { Controller, Get, Module } from '@nestjs/common';
import { ACCOUNT_TYPES, PRODUCTS, SERVICES, SHARE_VALUE_KES } from './catalog.data';

@Controller('catalog')
class CatalogController {
  @Get('accounts-products-services')
  getAll() {
    return {
      accountTypes: ACCOUNT_TYPES,
      products: PRODUCTS,
      services: SERVICES,
      shareValueKes: SHARE_VALUE_KES,
    };
  }
}

@Module({
  controllers: [CatalogController],
})
export class CatalogModule {}
