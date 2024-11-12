import React, { ReactElement, useState } from "react";

import logoSrc from "../src/assets/cat-icon.png";
import angryCatSrc from "../src/assets/angry-cat.png";

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
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <img src={imageSrc} width={800} height={600} alt="login" />
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <input
          onChange={(e) => handleOnChange(e, "id")}
          onKeyDown={handleKeyPress}
          placeholder="ID"
        />
        <input
          onChange={(e) => handleOnChange(e, "password")}
          onKeyDown={handleKeyPress}
          placeholder="Password"
        />
        <button onClick={handleLogin}>Login</button>
      </div>
    </div>
  );
};

export default Login;
