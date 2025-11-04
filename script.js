// ——— Khởi động Pyodide (Python trong trình duyệt) ———
let pyodide;
let pyReady = false;

const statusEl = () => document.getElementById("pyodide-status");
const outputEl = () => document.getElementById("output");
const checkEl = () => document.getElementById("check-status");
const assistantEl = () => document.getElementById("assistant-body");
const editorEl = () => document.getElementById("editor");

async function boot() {
  try {
    statusEl().textContent = "Đang tải Python…";
    pyodide = await loadPyodide();
    // Ghi lại đầu ra của Python vào bảng Console
    pyodide.setStdout({ batched: s => appendOut(s) });
    pyodide.setStderr({ batched: s => appendOut(s) });
    pyReady = true;
    statusEl().textContent = "Python đã sẵn sàng";
  } catch (e) {
    statusEl().textContent = "Không thể tải Python (kiểm tra kết nối mạng)";
    appendOut(String(e));
  }
}

function appendOut(text) {
  outputEl().textContent += text;
  outputEl().scrollTop = outputEl().scrollHeight;
}

function clearOut() {
  outputEl().textContent = "";
  checkEl().textContent = "";
}

// ——— Bộ kiểm tra bài (kiểm tra nhẹ nhàng, không gắt) ———
function checkLesson1(result) {
  const pyCheck = `
import json, math
ok = True
msg = []
try:
    profit
except NameError:
    ok = False; msg.append("Bạn chưa tạo biến 'profit'.")
else:
    if not isinstance(profit, list):
        ok = False; msg.append("'profit' phải là một danh sách (list).")
    else:
        if len(profit) != 12:
            ok = False; msg.append("Danh sách 'profit' phải có đủ 12 tháng.")
        # kiểm tra nhanh độ chính xác
        try:
            _rev = [120,130,150,160,170,190,210,220,210,200,180,170]
            _cost= [ 80, 85, 90, 95,100,110,120,125,130,120,110,100]
            _prof= [r-c for r,c in zip(_rev,_cost)]
            if profit != _prof:
                ok = False; msg.append("Giá trị 'profit' chưa đúng. Gợi ý: dùng zip(revenue, cost).")
        except Exception as e:
            ok = False; msg.append(f"Lỗi khi kiểm tra profit: {e}")

try:
    avg_profit
except NameError:
    ok = False; msg.append("Bạn chưa tạo biến 'avg_profit'.")
else:
    try:
        _avg = sum([120-80,130-85,150-90,160-95,170-100,190-110,210-120,220-125,210-130,200-120,180-110,170-100]) / 12
        if abs(avg_profit - _avg) > 1e-9:
            ok = False; msg.append("Giá trị 'avg_profit' chưa đúng. Gợi ý: dùng sum(profit)/len(profit).")
    except Exception as e:
        ok = False; msg.append(f"Lỗi khi kiểm tra avg_profit: {e}")

json.dumps({"ok": ok, "msg": msg})
`;
  try {
    const res = pyodide.runPython(pyCheck);
    return JSON.parse(res);
  } catch (e) {
    return { ok: false, msg: ["Không thể kiểm tra bài: " + e] };
  }
}

// ——— Hệ thống gợi ý (AI trợ giúp) ———
const hints = [
  "Gợi ý 1: Tạo 'profit' bằng list comprehension — [r - c for r, c in zip(revenue, cost)].",
  "Gợi ý 2: Trung bình = tổng / số phần tử. Dùng sum(profit) / len(profit).",
  "Gợi ý 3: Nếu lỗi NameError xuất hiện, hãy kiểm tra lại chính tả tên biến.",
  "Gợi ý 4: In thử biến trung gian để tự kiểm tra, ví dụ: print(profit[:3])."
];
let hintIndex = 0;

function showNextHint() {
  if (hintIndex < hints.length) {
    assistantEl().textContent = hints[hintIndex++];
  } else {
    assistantEl().textContent = "Bạn đã xem hết gợi ý. Bạn có thể nhấn “Xem lời giải”.";
    document.getElementById("solution").disabled = false;
  }
}

function revealSolution() {
  const solution = `# Lời giải
revenue = [120,130,150,160,170,190,210,220,210,200,180,170]
cost    = [ 80, 85, 90, 95,100,110,120,125,130,120,110,100]

profit = [r - c for r, c in zip(revenue, cost)]
avg_profit = sum(profit) / len(profit)

print("Lợi nhuận theo tháng:", profit)
print("Lợi nhuận trung bình:", avg_profit)
`;
  editorEl().value = solution;
  assistantEl().textContent = "Đã chèn lời giải. Hãy chạy code và xem kết quả nhé.";
}

// ——— Kết nối giao diện ———
document.addEventListener("DOMContentLoaded", () => {
  boot();

  document.getElementById("run").addEventListener("click", async () => {
    if (!pyReady) { assistantEl().textContent = "Python chưa sẵn sàng. Vui lòng chờ một chút…"; return; }
    clearOut();
    assistantEl().textContent = "Đang chạy code…";
    const code = editorEl().value;

    try {
      await pyodide.runPythonAsync(code);
    } catch (e) {
      appendOut(String(e) + "\n");
      assistantEl().textContent = "Có lỗi khi chạy code. Đọc thông báo trong Console và thử sửa nhé.";
      checkEl().textContent = "";
      return;
    }

    // Sau khi chạy, kiểm tra kết quả
    const verdict = checkLesson1();
    if (verdict.ok) {
      checkEl().textContent = "✅ Bài làm đúng! Tuyệt vời!";
      assistantEl().textContent = "Gợi ý tiếp theo: thử in ra top-3 tháng có lợi nhuận cao nhất?";
    } else {
      checkEl().textContent = "⚠ Một vài chỗ chưa chính xác.";
      assistantEl().innerHTML = verdict.msg.map(m => "• " + m).join("<br>");
    }
  });

  document.getElementById("hint").addEventListener("click", showNextHint);
  document.getElementById("solution").addEventListener("click", revealSolution);
});
