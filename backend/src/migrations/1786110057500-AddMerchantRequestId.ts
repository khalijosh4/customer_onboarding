import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMerchantRequestId1786110057500 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "applications" ADD "merchantRequestId" character varying`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "applications" DROP COLUMN "merchantRequestId"`,
        );
    }

}
