import React, { ReactElement } from "react";

interface Props {
  setLaborCostFile: React.Dispatch<React.SetStateAction<File | null>>;
  setPersonalInformations: React.Dispatch<React.SetStateAction<File | null>>;
  setWorkInformations: React.Dispatch<React.SetStateAction<File | null>>;
  setIsConvertOn: React.Dispatch<React.SetStateAction<boolean>>;
}

const CostUploader = ({
  setLaborCostFile,
  setPersonalInformations,
  setWorkInformations,
  setIsConvertOn
}: Props): ReactElement => {
  return (
    <section>
      <div>
        <label>최종 엑셀파일</label>
        <input
          type="file"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setWorkInformations(e.target.files[0]);
            }
          }}
        />
      </div>

      <div>
        <label>인적 정보</label>
        <input
          type="file"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setPersonalInformations(e.target.files[0]);
            }
          }}
        />
      </div>

      <div>
        <label>노무비</label>
        <input
          type="file"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              setLaborCostFile(e.target.files[0]);
            }
          }}
        />
      </div>

      <div>
        <button>초기화</button>
        <button onClick={() => setIsConvertOn(true)}>
          근로계약서&노무비 변환본 다운로드
        </button>
      </div>
    </section>
  );
};

export default CostUploader;
