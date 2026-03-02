"""
AI Service: Tự động generate label tiếng Việt cho các field key.
Dùng Ollama (local) với model qwen3-coder-next.
"""
import json
import httpx
from typing import Optional
from app.core.config import get_settings
from app.core.logging import logger

settings = get_settings()

SYSTEM_PROMPT = """Bạn là trợ lý giúp tạo nhãn (label) tiếng Việt cho các field trong form tài liệu.
Nhiệm vụ: Nhận danh sách field keys (snake_case, tiếng Anh hoặc tiếng Việt không dấu), 
trả về JSON mapping key → label tiếng Việt đẹp, chuyên nghiệp.

Quy tắc:
- Label ngắn gọn, rõ ràng, đúng ngữ cảnh văn phòng/doanh nghiệp
- Viết hoa chữ đầu
- Không có dấu hai chấm ở cuối
- Chỉ trả về JSON thuần, không giải thích

Ví dụ input: ["ho_ten", "ngay_sinh", "so_cmnd", "dia_chi"]
Ví dụ output: {"ho_ten": "Họ và tên", "ngay_sinh": "Ngày sinh", "so_cmnd": "Số CMND/CCCD", "dia_chi": "Địa chỉ"}"""


OLLAMA_BASE_URL = "https://ollama.com"
OLLAMA_MODEL = "qwen3-coder-next"


async def generate_labels_with_ai(keys: list[str]) -> dict[str, str]:
    """
    Gọi Ollama Cloud API để auto-generate label tiếng Việt.
    Fallback về rule-based nếu API lỗi hoặc AI bị tắt.
    """
    if not settings.AI_ENABLED:
        logger.warning("ai_disabled", reason="falling back to rule-based labels")
        return _rule_based_labels(keys)

    if not settings.OLLAMA_API_KEY:
        logger.warning("ollama_no_api_key", reason="falling back to rule-based labels")
        return _rule_based_labels(keys)

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                headers={
                    "Authorization": f"Bearer {settings.OLLAMA_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": OLLAMA_MODEL,
                    "stream": False,
                    "messages": [
                        {
                            "role": "system",
                            "content": SYSTEM_PROMPT,
                        },
                        {
                            "role": "user",
                            "content": f"Tạo label tiếng Việt cho các field sau: {json.dumps(keys, ensure_ascii=False)}"
                        },
                    ],
                },
            )
            response.raise_for_status()
            data = response.json()

            raw_text = data["message"]["content"].strip()

            # Đảm bảo parse JSON sạch (model đôi khi wrap trong ```json```)
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
            raw_text = raw_text.strip()

            labels = json.loads(raw_text)
            logger.info("ai_labels_generated", count=len(labels), model=OLLAMA_MODEL)
            return labels

    except Exception as e:
        logger.warning("ai_label_failed", error=str(e), fallback="rule_based")
        return _rule_based_labels(keys)


def _rule_based_labels(keys: list[str]) -> dict[str, str]:
    """
    Fallback: Rule-based label generator không cần AI.
    Xử lý các pattern phổ biến trong văn bản tiếng Việt.
    """
    # Dictionary các từ phổ biến
    WORD_MAP = {
        "ho": "Họ", "ten": "Tên", "ho_ten": "Họ và tên",
        "ngay": "Ngày", "thang": "Tháng", "nam": "Năm",
        "ngay_sinh": "Ngày sinh", "ngay_cap": "Ngày cấp",
        "ngay_het_han": "Ngày hết hạn", "ngay_ky": "Ngày ký",
        "so": "Số", "so_cmnd": "Số CMND/CCCD", "so_cccd": "Số CCCD",
        "so_dien_thoai": "Số điện thoại", "so_hop_dong": "Số hợp đồng",
        "dia_chi": "Địa chỉ", "dia_chi_thuong_tru": "Địa chỉ thường trú",
        "email": "Email", "website": "Website",
        "chuc_vu": "Chức vụ", "phong_ban": "Phòng ban",
        "cong_ty": "Công ty", "don_vi": "Đơn vị",
        "luong": "Lương", "so_tien": "Số tiền", "tong_tien": "Tổng tiền",
        "gia": "Giá", "phi": "Phí", "tong": "Tổng",
        "mo_ta": "Mô tả", "ghi_chu": "Ghi chú", "noi_dung": "Nội dung",
        "ten_san_pham": "Tên sản phẩm", "so_luong": "Số lượng",
        "ma": "Mã", "ma_so": "Mã số", "ma_nhan_vien": "Mã nhân viên",
        "nguoi_ky": "Người ký", "nguoi_dai_dien": "Người đại diện",
        "quoc_tich": "Quốc tịch", "gioi_tinh": "Giới tính",
        "tinh": "Tỉnh/Thành phố", "quan": "Quận/Huyện", "phuong": "Phường/Xã",
    }

    result = {}
    for key in keys:
        if key in WORD_MAP:
            result[key] = WORD_MAP[key]
        else:
            # Fallback: chuyển snake_case → Title Case
            result[key] = " ".join(word.capitalize() for word in key.split("_"))

    return result
