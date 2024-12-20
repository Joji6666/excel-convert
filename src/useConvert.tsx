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
    workerInfos: WorkerInfo[]
  ): Promise<void> => {
    const arrayBuffer = await fileToArrayBuffer(file); // File 객체를 ArrayBuffer로 변환

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer); // ArrayBuffer를 사용하여 로드

    const worksheets = workbook.worksheets;

    workerInfos.forEach((workerInfo) => {
      worksheets.forEach((workSheet) => {
        workSheet.eachRow((row, rowIndex) => {
          if (row.getCell(2).value === workerInfo.name) {
            const topRow = workSheet.getRow(rowIndex - 1);
            topRow.getCell(8).value = workerInfo.id;
            topRow.getCell(13).value = workerInfo.phone;
            topRow.getCell(18).value = workerInfo.unitPrice;
            row.getCell(8).value = workerInfo.address;

            console.log(workerInfo.workDays, "days@");

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

      await insertWorkerInfo(laborCostFile, workerInfos);
      console.log(workerInfos, "workerInfos");
    }

    setIsConvertOn(false);
  };

  return { convertWorkData };
};

export default useConvert;
