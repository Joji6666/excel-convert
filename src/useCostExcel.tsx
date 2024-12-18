import ExcelJS from "exceljs";

interface Return {
  parseData: (file: File) => void;
}

const useCostExcel = (): Return => {
  const parseData = async (file: File): Promise<void> => {
    const arrayBuffer = await fileToArrayBuffer(file); // File 객체를 ArrayBuffer로 변환

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer); // ArrayBuffer를 사용하여 로드

    const worksheet = workbook.worksheets[0];

    console.log(worksheet);

    // 수정된 파일을 다시 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modified_file.xlsx";
    link.click();
  };

  // File 객체를 ArrayBuffer로 변환하는 함수
  const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  return { parseData };
};

export default useCostExcel;
