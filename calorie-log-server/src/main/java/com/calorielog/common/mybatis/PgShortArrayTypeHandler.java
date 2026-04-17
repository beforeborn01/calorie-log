package com.calorielog.common.mybatis;

import org.apache.ibatis.type.BaseTypeHandler;
import org.apache.ibatis.type.JdbcType;
import org.apache.ibatis.type.MappedTypes;

import java.sql.Array;
import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/**
 * 处理 PostgreSQL SMALLINT[] ↔ Java Integer[]。
 * Integer[] 读回来有两种可能：JDBC 返回 java.sql.Array 或已经是 Short[]。
 */
@MappedTypes(Integer[].class)
public class PgShortArrayTypeHandler extends BaseTypeHandler<Integer[]> {

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, Integer[] parameter, JdbcType jdbcType) throws SQLException {
        Short[] shorts = new Short[parameter.length];
        for (int j = 0; j < parameter.length; j++) {
            shorts[j] = parameter[j] == null ? null : parameter[j].shortValue();
        }
        Array array = ps.getConnection().createArrayOf("smallint", shorts);
        ps.setArray(i, array);
    }

    @Override
    public Integer[] getNullableResult(ResultSet rs, String columnName) throws SQLException {
        Array arr = rs.getArray(columnName);
        return toIntegerArray(arr);
    }

    @Override
    public Integer[] getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        return toIntegerArray(rs.getArray(columnIndex));
    }

    @Override
    public Integer[] getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        return toIntegerArray(cs.getArray(columnIndex));
    }

    private Integer[] toIntegerArray(Array sqlArray) throws SQLException {
        if (sqlArray == null) return null;
        Object raw = sqlArray.getArray();
        if (raw instanceof Short[] s) {
            Integer[] out = new Integer[s.length];
            for (int i = 0; i < s.length; i++) out[i] = s[i] == null ? null : s[i].intValue();
            return out;
        }
        if (raw instanceof Integer[] ints) return ints;
        if (raw instanceof Number[] nums) {
            Integer[] out = new Integer[nums.length];
            for (int i = 0; i < nums.length; i++) out[i] = nums[i] == null ? null : nums[i].intValue();
            return out;
        }
        if (raw instanceof Object[] objs) {
            List<Integer> list = new ArrayList<>(objs.length);
            for (Object o : objs) list.add(o == null ? null : Integer.valueOf(o.toString()));
            return list.toArray(new Integer[0]);
        }
        return null;
    }
}
