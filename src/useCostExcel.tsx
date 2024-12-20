import ExcelJS from "exceljs";
import { useState } from "react";
import { WorkerData } from "./types";
import { saveAs } from "file-saver";

interface Return {
  parseData: (file: File) => void;
  parseBasicInfoData: (file: File) => Promise<{
    workerDatas: WorkerData[];
    workDate: string;
    workLocation: string;
  }>;
  handleExcelDownload: (workderDatas: WorkerData[]) => Promise<void>;
}

const useCostExcel = (): Return => {
  const parseBasicInfoData = async (
    file: File
  ): Promise<{
    workerDatas: WorkerData[];
    workDate: string;
    workLocation: string;
  }> => {
    const arrayBuffer = await fileToArrayBuffer(file);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    const workers: WorkerData[] = [];
    let workDate = "";
    let workLocation = "";

    let currentWorker: WorkerData | null = null;

    // 데이터를 순차적으로 확인하여 각 사람에 대한 정보 처리
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 0) {
        workDate = row.getCell(1).text;
      }

      if (rowIndex === 1) {
        workLocation = row.getCell(1).text;
      }

      // 첫 번째 행은 헤더이므로 건너뛰기
      if (rowIndex < 5) return;

      // 첫 번째 줄에 해당하는 기본 정보 (이름, 주민등록번호, 직종, 주소)
      if (rowIndex % 2 === 1) {
        // 홀수 번째 줄 (첫 번째 줄)
        const jobTitle = row.getCell(2).text; // 직종 (소장, 공무 등)
        const name = row.getCell(3).text; // 이름
        const id = row.getCell(4).text; // 주민등록번호

        // 직종계는 무시
        if (
          jobTitle.includes("직종계") ||
          jobTitle.includes("외주계") ||
          jobTitle.includes("공종계") ||
          jobTitle.includes("현장계")
        ) {
          return;
        }

        const workDays = Array.from({ length: 15 }, (_, i) =>
          row.getCell(5 + i).value === 1 ? 1 : 0
        );

        // 기본 정보 저장
        currentWorker = {
          name,
          job: jobTitle,
          id,
          address: "",
          workDays // 출근일수는 나중에 추가
        };
      } else if (rowIndex % 2 === 0 && currentWorker) {
        // 짝수 번째 줄 (두 번째 줄)
        // 두 번째 줄에는 출근 일수 (1~31일)와 급여가 기록되어 있음

        const address = row.getCell(3).text; // 주소

        const workDays = Array.from({ length: 16 }, (_, i) =>
          row.getCell(5 + i).value === 1 ? 1 : 0
        );
        // 현재 worker에 출근일수와 급여를 추가
        if (currentWorker) {
          currentWorker.address = address;
          currentWorker.workDays = [...currentWorker.workDays, ...workDays];

          workers.push(currentWorker); // workers 배열에 추가
          currentWorker = null; // currentWorker를 초기화하여 다음 사람을 처리
        }
      }
    });

    console.log(workers, "workers@");

    const filteredWorkers = workers.filter((worker) => {
      // 주민등록번호 형식이 맞는지 확인하는 정규 표현식
      const regExp = /^\d{6}-\d{7}$/;
      return regExp.test(worker.id); // 주민등록번호가 형식에 맞으면 true, 아니면 false
    });

    console.log(filteredWorkers, "filteredWorkers");
    // 상태에 데이터를 저장
    return { workerDatas: filteredWorkers, workDate, workLocation };
  };

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

  const handleExcelDownload = async (
    workerDatas: WorkerData[]
  ): Promise<void> => {
    // 템플릿 파일 로드
    const templatePath = "/cost_template_2.xlsx"; // 파일 경로

    const workbook = new ExcelJS.Workbook();
    const response = await fetch(templatePath);
    const arrayBuffer = await response.arrayBuffer();

    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];

    // 소계와 합계가 각각 2줄씩 차지하고 있으므로 2줄을 복사하여 소계 위에 삽입
    // 소계 바로 위에 두 줄을 복사합니다.

    //   // 스타일 복사
    //   worksheet.getRow(subtotalRow - 3).eachCell((cell, colNumber) => {
    //     const originalCell = copyRow1.getCell(colNumber);
    //     cell.style = originalCell.style;
    //   });
    //   worksheet.getRow(subtotalRow-2).eachCell((cell, colNumber) => {
    //     const originalCell = copyRow2.getCell(colNumber);
    //     cell.style = originalCell.style;
    //   });

    workerDatas.forEach((worker) => {
      let subtotalRow = 0;
      let totalRow = 0;

      worksheet.eachRow((row, rowIndex) => {
        row.eachCell((cell) => {
          const cellValue = cell.value;
          const cellText =
            typeof cellValue === "string" ? cellValue.trim() : ""; // 값이 문자열인 경우만 처리

          if (cellText.includes("소계")) {
            subtotalRow = rowIndex; // "소계" 셀이 위치한 행 번호 저장
          }
          if (cellText.includes("합            계")) {
            totalRow = rowIndex; // "합계" 셀이 위치한 행 번호 저장
          }
        });
      });

      console.log(subtotalRow, "subtotalRow");
      console.log(totalRow, "total Row");

      if (subtotalRow > 0 && totalRow > 0) {
        worksheet.duplicateRow(subtotalRow - 2, 1, true);
        worksheet.duplicateRow(subtotalRow - 3, 1, true);

        // 데이터 삽입
        worksheet.getCell(`A${subtotalRow - 3}`).value = worker.name; // 이름
        worksheet.getCell(`B${subtotalRow - 3}`).value = worker.job; // 직종
        worksheet.getCell(`C${subtotalRow - 3}`).value = worker.id; // 주민등록번호
        worksheet.getCell(`D${subtotalRow - 3}`).value = worker.address; // 주소
      }

      // 출근 데이터 (1~31일)
      // worker.workDays.forEach((day, dayIndex) => {
      //   worksheet.getCell(`E${currentRow + dayIndex}`).value =
      //     day === 1 ? "출근" : "불출근";
      // });

      // 다음 행으로 이동 (2칸씩 밀면서)
      // currentRow += 3; // 두 칸씩 내려가므로 2를 더합니다.
    });

    // 소계와 합계, 복사된 두 줄을 포함한 모든 데이터가 내려갔으므로, 합계도 내려야 합니다.
    // 합계 역시 2칸 내려야 합니다.
    //   for (let i = totalRow; i <= totalRow + 1; i++) {
    //     worksheet.insertRow(i + 2, worksheet.getRow(i).values);
    //     worksheet.getRow(i + 2).eachCell((cell, colNumber) => {
    //       const originalCell = worksheet.getRow(i).getCell(colNumber);
    //       cell.style = originalCell.style;
    //     });
    //   }

    // 수정된 엑셀 파일을 다운로드
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "cost_modified_template.xlsx");
  };
  return { parseData, parseBasicInfoData, handleExcelDownload };
};

export default useCostExcel;
