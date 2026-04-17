package com.calorielog;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@MapperScan("com.calorielog.module.*.mapper")
@EnableAsync
@EnableScheduling
public class CalorieLogApplication {
    public static void main(String[] args) {
        SpringApplication.run(CalorieLogApplication.class, args);
    }
}
