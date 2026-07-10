package com.sanluong.config;

import com.sanluong.repository.ProductMasterRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(10)
public class DataMigrationRunner implements ApplicationRunner {

    private final ProductMasterRepository repository;

    public DataMigrationRunner(ProductMasterRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        String newMe = "[{\"soMe\":1,\"nangSuat\":3},{\"soMe\":2,\"nangSuat\":5.5},{\"soMe\":3,\"nangSuat\":8},{\"soMe\":4,\"nangSuat\":10.5},{\"soMe\":5,\"nangSuat\":13},{\"soMe\":6,\"nangSuat\":15.5}]";
        int count = repository.bulkUpdatePcpl2MeAndTocDoMayPlIfNull(newMe, 25);
        if (count > 0) {
            System.out.println("✅ Migration: đã cập nhật " + count + " sản phẩm PCPL2 (Dầu gội/Sữa tắm) — mẻ 6 cấp + tốc độ PL=25");
        }

        int count2 = repository.bulkUpdateTocDoMayPlByMachineIfNull("Hàn Nhiệt", 35);
        if (count2 > 0) {
            System.out.println("✅ Migration: đã cập nhật " + count2 + " sản phẩm Máy Chiết Tube Hàn Nhiệt — tốc độ PL=35");
        }

        int count3 = repository.bulkUpdatePcpl2DungDichMayPlIfNull("Máy Chiết 4 vòi bơm từ", 35);
        if (count3 > 0) {
            System.out.println("✅ Migration: đã cập nhật " + count3 + " sản phẩm PCPL2 Dung dịch — máy PL=Máy Chiết 4 vòi bơm từ, tốc độ=35");
        }
    }
}
