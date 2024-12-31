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

        let name = row.getCell(3).text; // 이름

        // 정규식으로 괄호 안에 영어 이름이 있는지 검사
        const isKoreanOnly = /^[가-힣]+$/.test(name);

        if (!isKoreanOnly && name) {
          const koreanName = name.match(/^[가-힣]+/);

          name = koreanName ? koreanName[0] : name; // 한글만 추출
        }
        const jobTitle = row.getCell(2).text; // 직종 (소장, 공무 등)

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

    const names = convertedInfos.map((workerInfo) => workerInfo.name);
    const countMap: { [key: string]: number } = {};

    worksheets.forEach((workSheet) => {
      workSheet.eachRow((row, rowIndex) => {
        if (rowIndex > 8) {
          const targetName = row.getCell(2).value;

          if (
            targetName &&
            typeof targetName === "string" &&
            names.find((name) => name.includes(targetName)) &&
            !row.getCell(1).value
          ) {
            countMap[workSheet.name] = countMap[workSheet.name]
              ? countMap[workSheet.name] + 1
              : 1;

            row.getCell(1).value = countMap[workSheet.name];
          }
        }
      });
    });

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
    saveAs(blob, `${file.name}.xlsx`);

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

    workerInfos.forEach((workerInfo) => {
      copySheet(workbook, worksheet.name, workerInfo, workDate);
    });

    deleteSheet(workbook, worksheet.name);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    saveAs(blob, `${workDate}_근로계약서.xlsx`);
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
    workerInfo: WorkerInfo,
    workDate: string
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
        const name = workerInfo.name; // 예: "고병규"

        // 이름을 한 글자씩 띄워서 변환
        const spacedName = name.split("").join(" ");

        row.getCell(3).value = spacedName;
        row.getCell(7).value = workerInfo.id;
        row.getCell(16).value = workerInfo.unitPrice;
      }
      if (rowIndex === 10) {
        row.getCell(3).value = workerInfo.address;
      }

      if (rowIndex === 11) {
        const prevPhoneValue = row.getCell(3).value;

        if (prevPhoneValue && typeof prevPhoneValue === "string") {
          row.getCell(3).value = prevPhoneValue.replace(
            /\b\d{3}-\d{4}-\d{4}\b/,
            workerInfo.phone
          );
        }
      }

      if (rowIndex === 16) {
        // 정규식으로 은행명, 계좌번호, 예금주 이름 추출
        const regex = /([가-힣]+)\s([\d-]+)\s(.+)$/;

        // 정규식 적용
        const match = workerInfo.bankNumber.match(regex);

        if (match) {
          const bankName = match[1]; // 은행명
          const accountNumber = match[2]; // 계좌번호
          const accountHolder = match[3]; // 예금주 이름

          console.log(bankName, "bankBame");
          console.log(accountHolder, "예금주");
          console.log(accountNumber, "계좌번호");

          const prevBankInfo = row.getCell(2).value;

          console.log(prevBankInfo, "prev bank info");

          if (prevBankInfo && typeof prevBankInfo === "string") {
            const updatedString = prevBankInfo
              .replace(/\(.*\)/, `(${bankName})`) // 은행명 부분을 추출한 은행명으로 교체
              .replace(/[\d-]+/, accountNumber); // 계좌번호 부분을 수정

            console.log(updatedString, "updatedString");
            row.getCell(2).value = updatedString;
            row.getCell(7).value = accountHolder;
          }
        } else {
          console.log("일치하는 패턴을 찾을 수 없습니다.");
        }
      }

      if (rowIndex === 20) {
        // workDate에서 년도와 월만 추출하는 정규식
        const match = workDate.match(/(\d{4})년\s(\d{2})월/);

        if (match) {
          const startYear = match[1]; // 시작년도 (2024)
          const startMonth = match[2]; // 시작월 (07)

          // 기존 cellValue 예시: "2024     년     01월      01일  ~   2024     년     01월     31일"
          let cellValue = row.getCell(2).value;

          // 기존 공백을 그대로 두고, 년도와 월만 교체하는 정규식 적용
          if (cellValue && typeof cellValue === "string") {
            // 월과 날짜를 교체
            cellValue = cellValue.replace(
              /(\d{4})\s+년\s+(\d{2})월\s+(\d{2})일/,
              `${startYear}년 ${startMonth}월 ${"01"}일` // 시작 날짜는 01일로 설정
            );

            // 마지막 날짜 계산 (해당 월의 마지막 일자 계산)
            const lastDay = new Date(
              Number(startYear),
              parseInt(startMonth),
              0
            ).getDate(); // 해당 월의 마지막 일자 계산

            // 끝 날짜를 월 마지막 날짜로 교체
            cellValue = cellValue.replace(
              /(\d{4})\s+년\s+(\d{2})월\s+(\d{2})일$/,
              `${startYear}년 ${startMonth}월 ${lastDay}일`
            );

            // 수정된 값 적용
            row.getCell(2).value = cellValue;

            console.log(cellValue); // 결과 확인
          }
        }
      }

      if (rowIndex === 31 || rowIndex === 34) {
        const cellValue = row.getCell(1).value; // 예: "동의자 성명 : 김청월 (인)"

        console.log(cellValue, "cell value@");

        if (cellValue && typeof cellValue === "string") {
          // 정규식으로 "동의자 성명 :" 뒤의 이름을 찾기
          const nameMatch = cellValue.match(/동의자 성명\s*[:：]\s*([^\(]+)/);

          if (nameMatch) {
            const updatedName = workerInfo.name; // workerInfo.name으로 바꿔줌

            // 이름을 업데이트
            const updatedCellValue = cellValue.replace(
              nameMatch[1],
              updatedName
            );

            // 공백 16칸을 삽입
            const modifiedCellValue = updatedCellValue.replace(
              /([가-힣]+)(\()/, // 한글 뒤의 '('를 찾는 정규식
              (_, name, bracket) => `${name}${" ".repeat(16)}${bracket}`
            );

            // 셀 값 업데이트
            row.getCell(1).value = modifiedCellValue;

            console.log("Updated Cell Value: ", modifiedCellValue); // 결과 확인
          }
        }
      }

      if (rowIndex === 62) {
        const cellValue = row.getCell(6).value; // 예: "계 약 일              2024년 01월 01일"
        console.log(cellValue, "cell value@ datataadat");
        let updatedCellValue = cellValue; // 초기 값으로 기존 cellValue를 사용

        if (
          cellValue &&
          typeof cellValue === "string" &&
          updatedCellValue &&
          typeof updatedCellValue === "string"
        ) {
          // 1. workerInfo.firstWorkingDay가 있으면 그 값을 사용
          if (workerInfo.firstWorkingDay) {
            const firstWorkingDay = new Date(workerInfo.firstWorkingDay); // 첫 근무일을 Date로 변환
            const year = firstWorkingDay.getFullYear(); // 연도
            const month = (firstWorkingDay.getMonth() + 1)
              .toString()
              .padStart(2, "0"); // 월 (1부터 시작)
            const day = firstWorkingDay.getDate().toString().padStart(2, "0"); // 날짜

            // 년도 교체: "2024년 "만 변경
            updatedCellValue = updatedCellValue.replace(
              /(\d{4})년/,
              `${year}년` // 연도만 교체하고 뒤 공백도 함께 처리
            );

            // 월 교체: "01월 "만 변경
            updatedCellValue = updatedCellValue.replace(
              /(\d{2})월/,
              `${month}월` // 월만 교체하고 뒤 공백도 함께 처리
            );

            // 일 교체: "01일"만 변경
            updatedCellValue = updatedCellValue.replace(
              /(\d{2})일/,
              `${day}일` // 일만 교체
            );

            // 수정된 값을 셀에 할당
            row.getCell(6).value = updatedCellValue;

            console.log("Updated Cell Value: ", updatedCellValue); // 변경된 셀 값 확인
          }
          // 2. workerInfo.firstWorkingDay가 없으면 다른 문자열에서 년도와 월을 추출
          else {
            // workDate에서 년도와 월을 추출 (예: "2024년 07월 일용노무비명세서 ( 2024년 07월 01일부터 2024년 07월 31일까지 )")
            const workDateMatch = workDate.match(/(\d{4})년\s(\d{2})월/);
            console.log(workDateMatch, "work date match@#@");
            if (workDateMatch) {
              const newYear = workDateMatch[1]; // 연도
              const newMonth = parseInt(workDateMatch[2], 10); // 월 (07 -> 7로 변환)

              // 년도 교체: "2024년 "만 변경
              updatedCellValue = updatedCellValue.replace(
                /(\d{4})년/,
                `${newYear}년` // 연도만 교체하고 뒤 공백도 함께 처리
              );

              // 월 교체: "01월 "만 변경
              updatedCellValue = updatedCellValue.replace(
                /(\d{2})월/,
                `${newMonth}월` // 월만 교체하고 뒤 공백도 함께 처리
              );
            }
          }
        }

        // 변경된 값을 셀에 할당
        row.getCell(6).value = updatedCellValue;

        console.log("Updated Cell Value: ", updatedCellValue); // 변경된 셀 값 확인
      }

      if (rowIndex === 64) {
        const cellValue = row.getCell(6).value; // 예: " 을 근 로 자 김청월 ( 인 )"

        if (cellValue && typeof cellValue === "string") {
          // 정규식으로 이름 부분 "김청월"을 찾기
          const nameMatch = cellValue.match(/\s([^\s\(\)]+)\s*\(\s*인\s*\)/);

          if (nameMatch) {
            const updatedName = workerInfo.name; // workerInfo.name으로 바꿔줌

            // 이름을 업데이트
            const updatedCellValue = cellValue.replace(
              nameMatch[1],
              updatedName
            );

            // 셀 값 업데이트
            row.getCell(6).value = updatedCellValue;
          }
        }
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
