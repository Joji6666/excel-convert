import React, { ReactElement, useEffect, useRef, useState } from "react";
import popcat from "../src/assets/popcat.png";
import popcatWow from "../src/assets/popcat-wow.png";
import useExcel from "./useExcel";
import Login from "./Login";
import useCostExcel from "./useCostExcel";
import { WorkerData } from "./types";
import CostUploader from "./CostUploader";
import useConvert from "./useConvert";

function Main(): ReactElement {
  const [isLogin, setIsLogin] = useState(false);
  const [imageSrc, setImageSrc] = useState(popcat);

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [workerDatas, setWorkerDatas] = useState<WorkerData[]>([]);
  const [laborCostFile, setLaborCostFile] = useState<null | File>(null);
  const [personalInformations, setPersonalInformations] = useState<null | File>(
    null
  );
  const [workInformations, setWorkInformations] = useState<null | File>(null);

  const [isConvetOn, setIsConvertOn] = useState(false);

  const { excelDownload } = useExcel();
  const { parseBasicInfoData, handleExcelDownload } = useCostExcel();
  const { convertWorkData } = useConvert(
    laborCostFile,
    personalInformations,
    workInformations,
    setIsConvertOn
  );

  const handleFiles = async (files: FileList): Promise<void> => {
    await excelDownload(files[0]);
  };

  const handleFileChange = async (): Promise<void> => {
    console.log(fileRef.current, fileRef.current?.files);
    if (fileRef.current && fileRef.current.files) {
      console.log(fileRef.current.files);

      const parsedWorkData = await parseBasicInfoData(fileRef.current.files[0]);

      setWorkerDatas(parsedWorkData.workerDatas);

      handleExcelDownload(parsedWorkData.workerDatas);
      // parseData(fileRef.current.files[0]); // 엑셀 파일을 넘겨서 수식과 스타일을 유지하면서 처리

      await handleFiles(fileRef.current.files);

      fileRef.current.value = "";
    }
  };

  const handleClick = (): void => {
    if (fileRef.current) {
      fileRef.current.click();
    }
  };

  const onDrop = (event: React.DragEvent): void => {
    event.preventDefault();
    if (event.dataTransfer.files) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const onDragOver = (event: React.DragEvent): void => {
    event.preventDefault();
  };

  useEffect(() => {
    if (isConvetOn) {
      convertWorkData();
    }
  }, [isConvetOn]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {isLogin ? (
        <>
          <CostUploader
            setLaborCostFile={setLaborCostFile}
            setPersonalInformations={setPersonalInformations}
            setWorkInformations={setWorkInformations}
            setIsConvertOn={setIsConvertOn}
          />
          <input
            type="file"
            ref={fileRef}
            style={{ display: "none" }}
            multiple
            onChange={(): void => {
              handleFileChange();
            }}
          />
          <img
            onMouseLeave={() => setImageSrc(popcat)}
            onMouseOver={() => setImageSrc(popcatWow)}
            onFocus={() => setImageSrc(popcatWow)}
            onClick={handleClick}
            src={imageSrc}
            width={500}
            height={500}
            alt="popcat"
            style={{ cursor: "pointer" }}
            onDrop={onDrop}
            onDragOver={onDragOver}
          />
        </>
      ) : (
        <Login setIsLogin={setIsLogin} />
      )}
    </div>
  );
}

export default Main;
