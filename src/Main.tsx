import React, { ReactElement, useRef, useState } from "react";
import popcat from "../src/assets/popcat.png";
import popcatWow from "../src/assets/popcat-wow.png";
import useExcel from "./useExcel";
import Login from "./Login";
import useCostExcel from "./useCostExcel";

function Main(): ReactElement {
  const [isLogin, setIsLogin] = useState(false);
  const [imageSrc, setImageSrc] = useState(popcat);
  const [isNormalType, setIsNormalType] = useState(true);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { excelDownload } = useExcel();
  const { parseData } = useCostExcel();

  const handleFiles = async (files: FileList): Promise<void> => {
    await excelDownload(files[0]);
  };

  const handleFileChange = async (): Promise<void> => {
    console.log(fileRef.current, fileRef.current?.files);
    if (fileRef.current && fileRef.current.files) {
      console.log(fileRef.current.files);

      if (!isNormalType) {
        parseData(fileRef.current.files[0]); // 엑셀 파일을 넘겨서 수식과 스타일을 유지하면서 처리
      } else {
        await handleFiles(fileRef.current.files);
      }

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
          <fieldset>
            <legend>업로드 타입을 고르시오</legend>

            <div>
              <input
                type="radio"
                id="normal"
                name="normal"
                value="normal"
                checked={isNormalType}
                onChange={() => setIsNormalType(true)}
              />
              <label htmlFor="normal">기본</label>
            </div>

            <div>
              <input
                type="radio"
                id="laborCosts"
                name="laborCosts"
                value="laborCosts"
                checked={!isNormalType}
                onChange={() => setIsNormalType(false)}
              />
              <label htmlFor="laborCosts">노무비</label>
            </div>
          </fieldset>
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
