import React, { ReactElement, useState } from "react";

import logoSrc from "../src/assets/cat-icon.png";
import angryCatSrc from "../src/assets/angry-cat.png";
import { Button, Input } from "antd";
import emotionStyled from "@emotion/styled";

const Login = ({
  setIsLogin
}: {
  setIsLogin: React.Dispatch<React.SetStateAction<boolean>>;
}): ReactElement => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [imageSrc, setImageSrc] = useState(logoSrc);

  const handleOnChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string
  ): void => {
    if (key === "id") {
      setId(e.target.value);
    } else {
      setPassword(e.target.value);
    }
  };

  const handleLogin = (): void => {
    if (id === "admin" && password === "1234") {
      setIsLogin(true);
    } else {
      setImageSrc(angryCatSrc);
      alert("Wrong user information. Who the FUCK are you?");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <Container>
      <H2>대진공무 통합 관제시스템</H2>
      <Wrapper>
        <Input
          onChange={(e) => handleOnChange(e, "id")}
          onKeyDown={handleKeyPress}
          placeholder="ID"
        />
        <Input
          onChange={(e) => handleOnChange(e, "password")}
          onKeyDown={handleKeyPress}
          placeholder="Password"
        />
        <Button onClick={handleLogin}>Login</Button>
      </Wrapper>
    </Container>
  );
};

export default Login;

const Container = emotionStyled.section`
padding: 36px;
display: flex;
align-items: center;
justify-content: center;
flex-direction:column;
`;

const Wrapper = emotionStyled.div`
display: flex;
flex-direction: column;
gap: 8px;
min-width: 600px;
`;

const H2 = emotionStyled.h2`
font-bold: 700;
font-size: 64px;
`;
