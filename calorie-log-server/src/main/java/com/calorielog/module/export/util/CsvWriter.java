package com.calorielog.module.export.util;

import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * 轻量 CSV writer：UTF-8 BOM 前缀让 Excel 正确识别中文；RFC 4180 转义。
 */
public final class CsvWriter {

    private static final byte[] UTF8_BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

    private CsvWriter() {}

    public static void write(OutputStream out, List<String> headers, List<List<String>> rows) throws IOException {
        out.write(UTF8_BOM);
        try (OutputStreamWriter w = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {
            writeRow(w, headers);
            for (List<String> row : rows) writeRow(w, row);
            w.flush();
        }
    }

    private static void writeRow(OutputStreamWriter w, List<String> cols) throws IOException {
        for (int i = 0; i < cols.size(); i++) {
            if (i > 0) w.write(',');
            w.write(escape(cols.get(i)));
        }
        w.write("\r\n");
    }

    private static String escape(String v) {
        if (v == null) return "";
        boolean needsQuote = v.indexOf(',') >= 0 || v.indexOf('"') >= 0
                || v.indexOf('\n') >= 0 || v.indexOf('\r') >= 0;
        if (!needsQuote) return v;
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }
}
