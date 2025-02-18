import { Button, Input, InputRef } from "antd";
import React, { ReactElement, useRef } from "react";
import styled from "@emotion/styled";

interface Props {
  workInformations: File | null;
  personalInformations: File | null;
  setLaborCostFile: React.Dispatch<React.SetStateAction<File | null>>;
  setPersonalInformations: React.Dispatch<React.SetStateAction<File | null>>;
  setWorkInformations: React.Dispatch<React.SetStateAction<File | null>>;
  setIsConvertOn: React.Dispatch<React.SetStateAction<boolean>>;
}

const CostUploader = ({
  setLaborCostFile,
  setPersonalInformations,
  setWorkInformations,
  setIsConvertOn,
  workInformations,
  personalInformations
}: Props): ReactElement => {
  const workInformationFileRef = useRef<InputRef | null>(null);
  const workerInformationFileRef = useRef<InputRef | null>(null);

  const handleReset = (): void => {
    setPersonalInformations(null);
    setWorkInformations(null);
    setIsConvertOn(false);
  };

  return (
    <Section>
      <Wrapper>
        <Label>최종 엑셀파일</Label>
        <Input
          ref={workInformationFileRef}
          type="file"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setWorkInformations(e.target.files[0]);
            }
          }}
        />
      </Wrapper>

      <Wrapper>
        <Label>인적 정보</Label>
        <Input
          ref={workerInformationFileRef}
          type="file"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setPersonalInformations(e.target.files[0]);
            }
          }}
        />
      </Wrapper>

      {/* <Wrapper>
        <Label>노무비</Label>
        <Input
          type="file"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setLaborCostFile(e.target.files[0]);
            }
          }}
        />
      </Wrapper> */}

      <Wrapper>
        <Button onClick={handleReset}>초기화</Button>
        <Button color="primary" onClick={() => setIsConvertOn(true)}>
          근로계약서&노무비 변환본 다운로드
        </Button>
      </Wrapper>
    </Section>
  );
};

export default CostUploader;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid black;
  padding: 16px;
  border-radius: 16px;
`;

const Wrapper = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const Label = styled.label`
  min-width: 100px;
`;
