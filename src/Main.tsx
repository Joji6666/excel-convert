import React, { ReactElement, useEffect, useState } from "react";

import useExcel from "./useExcel";
import Login from "./Login";

import CostUploader from "./CostUploader";
import useConvert from "./useConvert";
import { Input } from "antd";
import emotionStyled from "@emotion/styled";

function Main(): ReactElement {
  const [isLogin, setIsLogin] = useState(false);

  const [laborCostFile, setLaborCostFile] = useState<null | File>(null);
  const [personalInformations, setPersonalInformations] = useState<null | File>(
    null
  );
  const [workInformations, setWorkInformations] = useState<null | File>(null);

  const [isConvertOn, setIsConvertOn] = useState(false);

  const { excelDownload } = useExcel();

  const { convertWorkData } = useConvert(
    laborCostFile,
    personalInformations,
    workInformations,
    setIsConvertOn
  );

  const handleFiles = async (files: FileList): Promise<void> => {
    console.log(files[0]);
    await excelDownload(files[0]);
  };

  const handleFileChange = async (files: FileList): Promise<void> => {
    await handleFiles(files);
  };

  useEffect(() => {
    if (isConvertOn) {
      convertWorkData();
    }
  }, [isConvertOn]);

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
        <Container>
          <CostUploader
            setLaborCostFile={setLaborCostFile}
            setPersonalInformations={setPersonalInformations}
            setWorkInformations={setWorkInformations}
            setIsConvertOn={setIsConvertOn}
            workInformations={workInformations}
            personalInformations={personalInformations}
          />
          <Wrapper>
            <Label>기계소방 변환기</Label>
            <Input
              type="file"
              onChange={(e): void => {
                if (e.target.files) {
                  handleFileChange(e.target.files);
                }
              }}
            />
          </Wrapper>
        </Container>
      ) : (
        <Login setIsLogin={setIsLogin} />
      )}
    </div>
  );
}

export default Main;

const Container = emotionStyled.div`
display: flex;
gap: 64px;
align-items: center;
justify-content: center;
`;

const Wrapper = emotionStyled.div`
display: flex;
gap: 8px;
align-items: center;
padding: 16px;
border: 1px solid black;
border-radius: 16px;
`;

const Label = emotionStyled.label`
min-width: 130px;
`;
