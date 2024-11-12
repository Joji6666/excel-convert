import React, { ReactElement, useRef, useState } from "react";
import popcat from "../src/assets/popcat.png";
import popcatWow from "../src/assets/popcat-wow.png";
import useExcel from "./useExcel";
import Login from "./Login";

function Main(): ReactElement {
  const [isLogin, setIsLogin] = useState(false);
  const [imageSrc, setImageSrc] = useState(popcat);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { excelDownload } = useExcel();

  const handleFiles = async (files: FileList): Promise<void> => {
    await excelDownload(files[0]);
  };

  const handleFileChange = async (): Promise<void> => {
    console.log(fileRef.current, fileRef.current?.files);
    if (fileRef.current && fileRef.current.files) {
      console.log(fileRef.current.files);
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
