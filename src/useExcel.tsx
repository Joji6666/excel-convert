import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import JSZip from "jszip";

interface Return {
  excelDownload: (file: File) => Promise<void>;
}

interface InputData {
  date: string;
  name: string;
  birth: string;
  workContent: string;
  occupationType: string;
}

const firstHeaders = [
  {
    title: "출입인원현황",
    children: [
      {
        title: "이름"
      },
      {
        title: "전일"
      },
      {
        title: "금일"
      },
      {
        title: "비고"
      }
    ]
  }
];

const secondHeaders = [
  { title: "직종" },
  { title: "성명" },
  {
    title: "출역품수",
    children: [
      { title: "오전" },
      { title: "오후" },
      { title: "야간" },
      { title: "철야" },
      { title: "계" }
    ]
  },
  { title: "생년월일" },
  { title: "작업내용" }
];

const HEADER_ROW_STYLE = {
  fill: {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFdbeafe" }
  } as ExcelJS.Fill,
  font: {
    bold: true,
    color: { argb: "FF000000" }
  },
  alignment: {
    vertical: "middle",
    horizontal: "center" as ExcelJS.Alignment["horizontal"],
    wrapText: true
  } as Partial<ExcelJS.Alignment>,
  border: {
    top: {
      style: "thin" as ExcelJS.BorderStyle,
      color: { argb: "FFcccccc" }
    },
    left: {
      style: "thin" as ExcelJS.BorderStyle,
      color: { argb: "FFcccccc" }
    },
    bottom: {
      style: "thin" as ExcelJS.BorderStyle,
      color: { argb: "FFcccccc" }
    },
    right: {
      style: "thin" as ExcelJS.BorderStyle,
      color: { argb: "FFcccccc" }
    }
  }
} as const;

const extractKoreanName = (name: string) => {
  // 한글로만 이루어진 부분을 추출하는 정규식
  const match = typeof name === "string" ? name.match(/^[가-힣]+/) : name;
  return match ? match[0] : ""; // 매칭된 한글 이름 반환, 없으면 빈 문자열
};

const useExcel = (): Return => {
  const parseExcelFile = async (
    file: File | undefined
  ): Promise<InputData[]> => {
    if (!file) {
      return [];
    }

    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async (
        event: ProgressEvent<FileReader>
      ): Promise<void> => {
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();

        await workbook.xlsx.load(buffer);

        const data: InputData[] = [];

        const worksheet = workbook.getWorksheet(1);

        worksheet?.eachRow(
          { includeEmpty: true },
          (row: any, rowNumber: any) => {
            if (rowNumber > 3) {
              if (row.getCell(6).value && row.getCell(6).value !== "") {
                const tempParam: InputData = {
                  name:
                    (extractKoreanName(row.getCell(6).value) as string) ?? "",
                  birth:
                    (row.getCell(5).value
                      ? row.getCell(5).value.slice(0, 6)
                      : ("" as string)) ?? "",
                  date: (row.getCell(7).value as string) ?? "",
                  workContent: (row.getCell(11).value as string) ?? "",
                  occupationType: (row.getCell(4).value as string) ?? ""
                };

                data.push(tempParam);
              }
            }
          }
        );

        resolve(data);
      };

      reader.onerror = (error: ProgressEvent<FileReader>): void => {
        reject(error);
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const createHeadersRecursive = (
    worksheet: ExcelJS.Worksheet,
    headers: any[],
    startRow: number,
    startCol: number,
    maxDepth: number
  ): number => {
    let colIndex = startCol;

    headers.forEach((header) => {
      const currentRow = startRow;

      if (header.children && header.children.length > 0) {
        const totalChildLength = header.children.reduce(
          (acc: any, cur: any) =>
            acc + (cur.children ? cur.children.length : 1),
          0
        );

        worksheet.mergeCells(
          currentRow,
          colIndex,
          currentRow,
          colIndex + totalChildLength - 1
        );
        const parentCell = worksheet.getCell(currentRow, colIndex);
        parentCell.value = header.title as string;
        parentCell.style = HEADER_ROW_STYLE;

        colIndex = createHeadersRecursive(
          worksheet,
          header.children,
          currentRow + 1,
          colIndex,
          maxDepth
        );
      } else {
        // children이 없는 경우, 그 아래로 maxDepth만큼 셀을 병합
        const mergeStart = currentRow;
        const mergeEnd = currentRow + (maxDepth - startRow);
        worksheet.mergeCells(mergeStart, colIndex, mergeEnd, colIndex);
        const cell = worksheet.getCell(mergeStart, colIndex);
        cell.value = header.title as string;
        cell.style = HEADER_ROW_STYLE;

        colIndex++;
      }
    });

    return colIndex;
  };

  const calculateMaxDepth = (headers: any[]): number => {
    let maxDepth = 1;

    headers.forEach((header) => {
      if (header.children && header.children.length > 0) {
        const childDepth = calculateMaxDepth(header.children);
        if (childDepth + 1 > maxDepth) {
          maxDepth = childDepth + 1;
        }
      }
    });

    return maxDepth;
  };

  const createHeaders = (
    worksheet: ExcelJS.Worksheet,
    headers: any[]
  ): void => {
    const startRow = 1;
    const startCol = 1;

    // 헤더의 최대 깊이를 계산
    const maxDepth = calculateMaxDepth(headers);

    createHeadersRecursive(worksheet, headers, startRow, startCol, maxDepth);
  };

  const setMaxColumnWidth = (worksheet: ExcelJS.Worksheet): void => {
    const maxColumnWidth = 70;
    worksheet.columns.forEach(function (column: any) {
      if (column && column.eachCell) {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, function (cell: any) {
          const columnLength = cell.value
            ? cell.value.toString().length + 10
            : 15;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width =
          maxLength < 10
            ? 10
            : maxLength > maxColumnWidth
            ? maxColumnWidth
            : maxLength;
      }
    });
  };

  const excelDownload = async (file: File): Promise<void> => {
    const datas = await parseExcelFile(file);
    console.log(datas, "datas@");
    if (datas.length > 0) {
      console.log(datas, "datas@@");

      const datas1 = datas.map((data) => [data.name, "", "1", ""]);
      const datas2 = datas.map((data) => [
        data.occupationType,
        data.name,
        "0.5",
        "0.5",
        "",
        "",
        "1",
        data.birth,
        data.workContent
      ]);

      // 첫 번째 Excel 파일 생성
      const workbook1 = new ExcelJS.Workbook();
      const worksheet1 = workbook1.addWorksheet("first");
      createHeaders(worksheet1, firstHeaders);
      setMaxColumnWidth(worksheet1);
      datas1.forEach((item: any) => worksheet1.addRow([...item]));
      const buffer1 = await workbook1.xlsx.writeBuffer();

      // 두 번째 Excel 파일 생성
      const workbook2 = new ExcelJS.Workbook();
      const worksheet2 = workbook2.addWorksheet("second");
      createHeaders(worksheet2, secondHeaders);
      setMaxColumnWidth(worksheet2);
      datas2.forEach((item: any) => worksheet2.addRow([...item]));
      const buffer2 = await workbook2.xlsx.writeBuffer();

      // Zip 파일 생성
      const zip = new JSZip();
      zip.file("기계소방 공사일보.xlsx", buffer1);
      zip.file("기계소방 출역점검표.xlsx", buffer2);

      // Zip 파일을 Blob으로 변환 후 다운로드
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "기계소방_자료.zip");
    }
  };

  return {
    excelDownload
  };
};

export default useExcel;
