package com.calorielog.common.utils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public final class DateUtils {
    public static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    private DateUtils() {}

    public static LocalDate todayInZone(String tz) {
        return LocalDate.now(safeZone(tz));
    }

    public static ZoneId safeZone(String tz) {
        try {
            return tz == null || tz.isBlank() ? ZoneId.of("Asia/Shanghai") : ZoneId.of(tz);
        } catch (Exception e) {
            return ZoneId.of("Asia/Shanghai");
        }
    }

    public static LocalDate parseDate(String s) {
        if (s == null || s.isBlank()) return null;
        return LocalDate.parse(s, ISO_DATE);
    }

    public static LocalDateTime nowUtc() {
        return ZonedDateTime.now(ZoneId.of("UTC")).toLocalDateTime();
    }
}
