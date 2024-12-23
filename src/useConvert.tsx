import React from "react";
import { PersonalInfo, WorkerData, WorkerInfo } from "./types";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

interface Return {
  convertWorkData: () => void;
}

const useConvert = (
  laborCostFile: null | File,
  personalInformations: null | File,
  workInformations: null | File,
  setIsConvertOn: React.Dispatch<React.SetStateAction<boolean>>
): Return => {
  // File 객체를 ArrayBuffer로 변환하는 함수
  const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const getWeekends = (yearMonth: string): string[] => {
    // 입력받은 년도와 월로 Date 객체 생성
    const [year, month] = yearMonth.split("-");
    const startDate = new Date(Number(year), Number(month) - 1, 1); // 해당 월의 첫날
    const endDate = new Date(Number(year), Number(month), 0); // 해당 월의 마지막 날

    const weekends = [];

    // 해당 월의 시작일부터 끝일까지 반복하면서 주말 찾기
    for (let day = startDate; day <= endDate; day.setDate(day.getDate() + 1)) {
      const dayOfWeek = day.getDay(); // 일요일은 0, 토요일은 6
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // 주말이면
        weekends.push(new Date(day)); // 주말 날짜 추가
      }
    }

    // 주말 날짜를 "YYYY-MM-DD" 형식으로 변환하여 반환
    return weekends.map((date) => {
      const day = date.getDate().toString().padStart(2, "0");
      return day;
    });
  };

  const extractMonthYear = (inputString: string): string | null => {
    // 정규 표현식으로 'YYYY년 MM월' 형식을 찾기
    const regex = /(\d{4})년\s*(\d{2})월/;
    const match = inputString.match(regex);

    if (match) {
      const year = match[1];
      const month = match[2];
      return `${year}-${month}`; // "YYYY-MM" 형식으로 반환
    } else {
      return null; // 원하는 형식이 없으면 null 반환
    }
  };

  const parseWorkInfoData = async (
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
      if (rowIndex === 1) {
        workDate = row.getCell(1).text;
      }

      if (rowIndex === 2) {
        workLocation = row.getCell(2).text;
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

  const parsePersonalInfo = async (file: File): Promise<PersonalInfo[]> => {
    const arrayBuffer = await fileToArrayBuffer(file);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];

    const personalInfos: PersonalInfo[] = [];
    worksheet.eachRow((row, rowIndex) => {
      // 첫 번째 행은 헤더이므로 건너뛰기
      if (rowIndex < 2) return;

      const name = row.getCell(1).text;
      const unitPrice = row.getCell(2).text;
      const phone = row.getCell(3).text;
      const id = row.getCell(4).text;
      const bankNumber = row.getCell(5).text;
      const code = row.getCell(6).text;
      const firstWorkingDay = row.getCell(7).text;

      const workerInfo: PersonalInfo = {
        name,
        unitPrice,
        phone,
        id,
        bankNumber,
        code,
        firstWorkingDay: firstWorkingDay
          ? new Date(firstWorkingDay).toISOString().split("T")[0]
          : ""
      };

      personalInfos.push(workerInfo);
    });

    return personalInfos;
  };

  const insertWorkerInfo = async (
    file: File,
    workerInfos: WorkerInfo[],
    workDate: string,
    workLocation: string
  ): Promise<void> => {
    const arrayBuffer = await fileToArrayBuffer(file); // File 객체를 ArrayBuffer로 변환

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer); // ArrayBuffer를 사용하여 로드

    const worksheets = workbook.worksheets;

    const yearMonth = extractMonthYear(workDate);
    let weekends: string[] = [];
    if (yearMonth) {
      weekends = getWeekends(yearMonth);
    }

    console.log(workerInfos, "infos@");

    // const convertedInfos = workerInfos.reduce((acc: WorkerInfo[], cur) => {
    //   if (!cur.job.includes("화기감시")) {
    //     acc.push(cur);
    //   } else {
    //     const weekendInfo: WorkerInfo = {
    //       ...cur,
    //       job: "직영",
    //       workDays: []
    //     };

    //     const weekDaysInfo: WorkerInfo = { ...cur, workDays: [] };

    //     cur.workDays.forEach((day, index) => {
    //       if (weekends.includes((index + 1).toString()) && day === 1) {
    //         weekendInfo.workDays.push(1);
    //       } else {
    //         weekendInfo.workDays.push(0);
    //       }
    //     });

    //     acc.push(weekendInfo);
    //   }

    //   return acc;
    // }, []);

    const convertedInfos = workerInfos.reduce((acc: WorkerInfo[], cur) => {
      const prevInfoIndex = acc.findIndex((worker) => worker.id === cur.id); // prevInfo가 있는 인덱스 찾기

      if (prevInfoIndex !== -1) {
        const prevInfo = acc[prevInfoIndex];

        const prevWorkDays = prevInfo.workDays.filter((day) => day === 1);
        const currentWorkDays = cur.workDays.filter((day) => day === 1);

        console.log(prevWorkDays.length, currentWorkDays.length);

        // 두 배열을 조합하여 결과를 생성
        const combinedWorkDays = prevInfo.workDays.map((day, index) => {
          return prevInfo.workDays[index] === 1 || cur.workDays[index] === 1
            ? 1
            : 0;
        });

        // 새로운 정보 생성
        const convertedInfo: WorkerInfo = {
          ...cur,
          job:
            prevWorkDays.length > currentWorkDays.length
              ? prevInfo.job
              : cur.job,
          workDays: combinedWorkDays
        };

        // prevInfo를 convertedInfo로 교체
        acc[prevInfoIndex] = convertedInfo;
      } else {
        acc.push(cur); // prevInfo가 없으면 cur을 새로운 항목으로 추가
      }

      return acc;
    }, []);

    convertedInfos.forEach((workerInfo) => {
      worksheets.forEach((workSheet) => {
        workSheet.eachRow((row, rowIndex) => {
          if (workSheet.name === "관리자" && rowIndex === 1) {
            const cellValue = row.getCell(22).value; // 예: "2024년 08월"

            // workDate에서 연도와 월을 추출
            const match = workDate.match(/(\d{4})년\s(\d{2})월/);
            if (match) {
              const newYear = match[1]; // 연도 (예: 2024)
              const newMonth = match[2]; // 월 (예: 07)

              if (cellValue && typeof cellValue === "string") {
                // 기존 cellValue에서 연도를 먼저 바꿔주기
                let updatedCellValue = cellValue.replace(
                  /(\d{4})년/,
                  `${newYear}년`
                );

                // 그 후 월을 바꿔주기
                updatedCellValue = updatedCellValue.replace(
                  /(\d{2})월/,
                  `${newMonth}월`
                );

                console.log("Updated Cell Value: ", updatedCellValue); // 변경된 cellValue 출력

                // 이 값을 셀에 다시 할당
                row.getCell(22).value = updatedCellValue;
              }
            }
          }

          if (workSheet.name === "관리자" && rowIndex === 3) {
            const startDay = row.getCell(28).value; // 예: 2024-08-01
            const endDay = row.getCell(34).value; // 예: "2024-08-31"

            if (startDay && endDay) {
              const formattedStartDay = new Date(startDay.toString())
                .toISOString()
                .split("T")[0];
              const formattedEndDay = new Date(endDay.toString())
                .toISOString()
                .split("T")[0];

              console.log(formattedStartDay);
              console.log(formattedEndDay);

              // workDate에서 연도와 월을 추출
              const match = workDate.match(/(\d{4})년\s(\d{2})월/);
              if (match) {
                const newYear = match[1]; // 연도 (예: 2024)
                const newMonth = match[2]; // 월 (예: 07)

                if (
                  formattedStartDay &&
                  typeof formattedStartDay === "string"
                ) {
                  // 기존 시작일을 연도와 월에 맞게 수정
                  let updatedStartDay = formattedStartDay.replace(
                    /(\d{4})-(\d{2})-(\d{2})/,
                    `${newYear}-${newMonth}-$3`
                  );

                  console.log("Updated Start Day: ", updatedStartDay); // 변경된 시작일 출력

                  // 이 값을 셀에 다시 할당
                  row.getCell(28).value = updatedStartDay;
                }

                if (formattedEndDay && typeof formattedEndDay === "string") {
                  // 기존 종료일을 연도와 월에 맞게 수정
                  let updatedEndDay = formattedEndDay.replace(
                    /(\d{4})-(\d{2})-(\d{2})/,
                    `${newYear}-${newMonth}-$3`
                  );

                  console.log("Updated End Day: ", updatedEndDay); // 변경된 종료일 출력

                  // 이 값을 셀에 다시 할당
                  row.getCell(34).value = updatedEndDay;
                }
              }
            }
          }

          if (
            row.getCell(2).value &&
            typeof row.getCell(2).value === "string" &&
            workerInfo.name.includes(row.getCell(2).value as string)
          ) {
            const topRow = workSheet.getRow(rowIndex - 1);
            topRow.getCell(5).value = topRow.getCell(5).value
              ? topRow.getCell(5).value
              : workerInfo.job;
            topRow.getCell(1).value = workerInfo.code;
            topRow.getCell(8).value = workerInfo.id;
            topRow.getCell(13).value = workerInfo.phone;
            topRow.getCell(18).value = workerInfo.unitPrice;
            row.getCell(8).value = workerInfo.address;

            workerInfo.workDays.forEach((day, index) => {
              if (index < 15) {
                topRow.getCell(20 + index).value = day;
              } else {
                row.getCell(20 + index - 15).value = day;
              }
            });
          }
        });
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "cost_modified_template.xlsx");

    await createEmploymentContract(workerInfos, workDate, workLocation);
  };

  const createEmploymentContract = async (
    workerInfos: WorkerInfo[],
    workDate: string,
    workLocation: string
  ): Promise<void> => {
    const templatePath = "/employment_contract_sample.xlsx"; // 파일 경로

    const workbook = new ExcelJS.Workbook();
    const response = await fetch(templatePath);
    const arrayBuffer = await response.arrayBuffer();

    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];

    console.log(worksheet, "sheet@");

    workerInfos.forEach((workerInfo) => {
      copySheet(workbook, worksheet.name, workerInfo);
    });

    // deleteSheet(workbook, worksheet.name);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, "converted_employment_contract.xlsx");
  };

  const deleteSheet = (workbook: ExcelJS.Workbook, sheetName: string) => {
    const sheet = workbook.getWorksheet(sheetName);
    if (sheet) {
      workbook.removeWorksheet(sheet.id); // 시트 삭제
      console.log(`시트 ${sheetName}이 삭제되었습니다.`);
    } else {
      console.log(`시트 ${sheetName}을 찾을 수 없습니다.`);
    }
  };

  const copySheet = (
    workbook: ExcelJS.Workbook,
    sheetName: string,
    workerInfo: WorkerInfo
  ) => {
    const originalSheet = workbook.getWorksheet(sheetName);
    if (!originalSheet) {
      console.log(`Sheet ${sheetName} not found!`);
      return;
    }

    // 새 시트 생성
    const name = workbook.worksheets.find(
      (workSheet) => workSheet.name === workerInfo.name
    )
      ? `${workerInfo.name}-copy`
      : workerInfo.name;
    const newSheet = workbook.addWorksheet(`${name}-temp`);
    const tempModel = structuredClone(originalSheet.model);
    tempModel.name = `temp-temp-temp`;
    newSheet.model = tempModel;
    newSheet.name = name;

    originalSheet.model.merges.forEach((merge) => newSheet.mergeCells(merge));

    originalSheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      const newRow = newSheet.getRow(rowIndex);

      // 각 셀을 복사
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const newCell = newRow.getCell(colNumber);

        // 스타일 복사
        newCell.style = cell.style;

        if (cell.style && cell.style.alignment) {
          newCell.style.alignment = structuredClone(cell.style.alignment);
        }
      });
    });

    newSheet.eachRow((row, rowIndex) => {
      if (rowIndex === 9) {
        row.getCell(3).value = workerInfo.name;
      }
    });
  };

  const convertWorkData = async (): Promise<void> => {
    console.log("convert");
    if (workInformations && personalInformations && laborCostFile) {
      const parsedWorkData = await parseWorkInfoData(workInformations);
      console.log(parsedWorkData, "parsedWorkData");
      const personalInfos = await parsePersonalInfo(personalInformations);
      console.log(personalInfos, "personalInfos");

      const workerInfos: WorkerInfo[] = parsedWorkData.workerDatas.reduce(
        (acc: WorkerInfo[], cur) => {
          const targetPersonalInfo = personalInfos.find(
            (personalInfo) => personalInfo.id === cur.id.replace("-", "")
          );

          acc.push({
            name: cur.name,
            job: cur.job,
            id: cur.id,
            address: cur.address,
            workDays: cur.workDays,
            unitPrice: targetPersonalInfo?.unitPrice ?? "",
            phone: targetPersonalInfo?.phone ?? "",
            bankNumber: targetPersonalInfo?.bankNumber ?? "",

            code: targetPersonalInfo?.code ?? "",
            firstWorkingDay: targetPersonalInfo?.firstWorkingDay ?? ""
          });

          return acc;
        },
        []
      );

      await insertWorkerInfo(
        laborCostFile,
        workerInfos,
        parsedWorkData.workDate,
        parsedWorkData.workLocation
      );
      console.log(workerInfos, "workerInfos");
    }

    setIsConvertOn(false);
  };

  return { convertWorkData };
};

export default useConvert;
