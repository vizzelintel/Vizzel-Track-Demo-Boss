-- Thailand geo LOV (sample for demo; extend from production dataset as needed)

CREATE TABLE IF NOT EXISTS lov_province (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lov_district (
    id SERIAL PRIMARY KEY,
    province_id INT REFERENCES lov_province(id),
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lov_subdistrict (
    id SERIAL PRIMARY KEY,
    district_id INT REFERENCES lov_district(id),
    name TEXT NOT NULL
);

INSERT INTO lov_province (id, name) VALUES
    (1, 'กรุงเทพมหานคร'),
    (2, 'เชียงใหม่'),
    (3, 'ขอนแก่น')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lov_district (id, province_id, name) VALUES
    (1, 1, 'เขตบางรัก'),
    (2, 1, 'เขตปทุมวัน'),
    (3, 2, 'อำเภอเมืองเชียงใหม่'),
    (4, 3, 'อำเภอเมืองขอนแก่น')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lov_subdistrict (id, district_id, name) VALUES
    (1, 1, 'แขวงสีลม'),
    (2, 1, 'แขวงสุริยวงศ์'),
    (3, 2, 'แขวงลุมพินี'),
    (4, 3, 'ตำบลศรีภูมิ'),
    (5, 4, 'ตำบลในเมือง')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lov_menu (id, menu_name, menu_path) VALUES
    (1, 'เอกสาร', '/documents'),
    (2, 'เบิก/ยืม Pro', '/withdrawal'),
    (3, 'รายงานขั้นสูง', '/dashboard/reports'),
    (4, 'ตรวจนับ', '/audit/ongoing'),
    (5, 'จำหน่าย', '/sales')
ON CONFLICT (id) DO NOTHING;
