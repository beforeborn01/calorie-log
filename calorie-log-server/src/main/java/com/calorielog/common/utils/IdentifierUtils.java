package com.calorielog.common.utils;

import java.util.regex.Pattern;

public final class IdentifierUtils {
    private static final Pattern PHONE = Pattern.compile("^1[3-9]\\d{9}$");
    private static final Pattern EMAIL = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    public enum IdentifierType { PHONE, EMAIL, UNKNOWN }

    private IdentifierUtils() {}

    public static IdentifierType detect(String identifier) {
        if (identifier == null) return IdentifierType.UNKNOWN;
        String s = identifier.trim();
        if (PHONE.matcher(s).matches()) return IdentifierType.PHONE;
        if (EMAIL.matcher(s).matches()) return IdentifierType.EMAIL;
        return IdentifierType.UNKNOWN;
    }

    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return phone;
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    public static String maskEmail(String email) {
        if (email == null) return null;
        int at = email.indexOf('@');
        if (at <= 0) return email;
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 2) return local.charAt(0) + "*" + domain;
        return local.charAt(0) + "***" + local.charAt(local.length() - 1) + domain;
    }
}
