# route-system

ระบบบันทึกพิกัดและคำนวณเส้นทางจัดส่ง — สำหรับ deploy บน GitHub Pages

## โครงสร้างไฟล์
- `index.html` — หน้า UI หลัก
- `script.js` — logic ด้าน client
- `style.css` — สไตล์

## ขั้นตอนการตั้งค่า (สรุป)

### 1) เตรียม Google Sheet
สร้าง Google Sheet และเพิ่มชีตชื่อ `Data` (ตามค่า default ใน Apps Script).
เพิ่ม header แถวแรก ดังนี้:
```
name | note | phone | lat | lng | timestamp | status
```

### 2) ติดตั้ง Google Apps Script (Server)
1. เปิด Google Sheets → `Extensions` → `Apps Script`
2. วางโค้ด Apps Script (ตัวอย่างที่ผมให้ก่อนหน้า) ลงใน `Code.gs`
3. ในโค้ดให้ตรวจสอบค่า `SHEET_ID` และ `SHEET_NAME` ให้ตรงกับชีตคุณ
4. `Deploy` → `New deployment` → เลือก `Web app`
   - **Execute as:** Me
   - **Who has access:** Anyone
5. คัดลอก URL ที่ได้ (ลงท้ายด้วย `/exec`) มาใส่ใน `script.js` ที่ตัวแปร `API_URL` (บรรทัดบนสุด)

**สำคัญ:** Apps Script ต้องตั้งค่าให้อนุญาตการเข้าถึง (Anyone) เพื่อให้ fetch จาก GitHub Pages ทำงาน และโค้ด Apps Script ต้องคืนค่า header CORS (`Access-Control-Allow-Origin: *`) — ตัวอย่างโค้ด Apps Script ที่แนะนำมีการใส่ header นี้แล้ว

### 3) ตั้งค่า Google Maps API Key
- ใช้ API Key สำหรับ Maps JavaScript API (key ต้องเปิดใช้งานใน Google Cloud Console)
- ใน `index.html` ผมวาง key ให้ตามที่คุณให้ (หากต้องการเปลี่ยน ให้แก้ที่ script tag ของ Google Maps)

### 4) นำไฟล์ไปวางใน GitHub
1. สร้าง repository ชื่อ `route-system`
2. อัปโหลด 4 ไฟล์: `index.html`, `script.js`, `style.css`, `README.md`
3. ใน GitHub → Settings → Pages → เลือก `main` branch และ `/ (root)` → Save
4. รอสักครู่แล้วเข้าที่ `https://<your-username>.github.io/route-system`

### 5) ทดสอบ
- เปิดหน้าเว็บ ดูว่าดึงข้อมูลจากชีตขึ้นมาหรือไม่ (ปุ่ม ดึงข้อมูลล่าสุด)
- ทดสอบบันทึกข้อมูลใหม่/แก้ไข/ลบ
- ทดสอบคำนวณเส้นทางและดูผลบนแผนที่

## ปัญหาที่อาจพบบ่อย
- **Failed to fetch / CORS error:** ให้ตรวจสอบว่า Apps Script ถูก deploy แบบ Anyone และ URL ถูกต้อง (`/exec`)
- **Key ของ Google Maps ใช้ไม่ได้:** ตรวจสอบที่ Google Cloud Console ว่าเปิด Maps JavaScript API

## ต้องการให้ผมช่วยอะไรเพิ่มเติมไหม?
- ผมสามารถ: deploy ให้, สร้าง repo ให้, หรือช่วยคุณเชื่อม Apps Script แบบ remote
- แจ้งผมได้เลยว่าต้องการให้ผมทำขั้นตอนไหนต่อ
