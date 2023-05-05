import React, { useEffect, useState } from "react";
import "@fuel-wallet/sdk";
import "./App.css";
// Import the contract factory -- you can find the name in index.ts.
// You can also do command + space and the compiler will suggest the correct name.
import { CounterContractAbi__factory } from "./contracts";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

// The address of the contract deployed the Fuel testnet
const CONTRACT_ID =
  "0x9148307092acc36d79c693a03c4ab0512954d3d8390d32d1774169386bf5a01a";

function App() {
  const [connected, setConnected] = useState<boolean>(false);
  const [account, setAccount] = useState<string>("");
  const [counter, setCounter] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      checkConnection();
      setLoaded(true);
    }, 200)
    if (connected) getCount();

    // Simple call from server to check whether it's live.
    fetch("/live")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.text();
      })
      .then((text) => {
        const data = JSON.parse(text);
        console.log(data.message);
      })
      .catch((err) => {
        console.error("Error checking live status of server:", err);
      });
  }, [connected])


  async function connect() {
    if (window.fuel) {
     try {
       await window.fuel.connect();
       const [account] = await window.fuel.accounts();
       setAccount(account);
       setConnected(true);
     } catch(err) {
       console.log("error connecting: ", err);
     }
    }
   }

  async function checkConnection() {
    if (window.fuel) {
      const isConnected = await window.fuel.isConnected();
      if (isConnected) {
        const [account] = await window.fuel.accounts();
        setAccount(account);
        setConnected(true);
      }
    }
  }

  async function getCount() {
    if (window.fuel) {
      const wallet = await window.fuel.getWallet(account);
      const contract = CounterContractAbi__factory.connect(CONTRACT_ID, wallet);
      const { value } = await contract.functions.count().get();
      setCounter(value.toNumber());
    }
  }

  async function increment() {
    if (window.fuel) {
      const wallet = await window.fuel.getWallet(account);
      const contract = CounterContractAbi__factory.connect(CONTRACT_ID, wallet);
      // Creates a transactions to call the increment function
      // because it creates a TX and updates the contract state this requires the wallet to have enough coins to cover the costs and also to sign the Transaction
      try {
        await contract.functions.increment().txParams({ gasPrice: 1 }).call();
        getCount();
      } catch(err) {
        console.log("error sending transaction...", err);
      }
    }
  }

  async function btnRegBegin() {
    fetch("/generate-registration-options")
      .then(async (res) => {
        const resp = await fetch('/generate-registration-options');

        let attResp;
        try {
          const opts = await resp.json();
          attResp = await startRegistration(opts);
        } catch (error) {
          throw error;
        }

        const verificationResp = await fetch('/verify-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(attResp),
        });

        const verificationJSON = await verificationResp.json();
        console.log(verificationJSON);
        if (verificationJSON && verificationJSON.verified) {
          console.log("Registration successful");
        } else {
          console.error("Registration failed");
        }
      })
      .catch((err) => {
        console.error("Error fetching data:", err);
      }); 
  }

  async function btnAuthBegin() {

    const resp = await fetch('/generate-authentication-options');

    let asseResp;
    try {
      const opts = await resp.json();

      asseResp = await startAuthentication(opts);
    } catch (error) {
      throw error;
    }

    const verificationResp = await fetch('/verify-authentication', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(asseResp),
    });

    const verificationJSON = await verificationResp.json();
    console.log(verificationJSON);
    if (verificationJSON && verificationJSON.verified) {
      console.log("Authentication successful");
    } else {
      console.error("Authentication failed");
    }

  }
  


  if (!loaded) return null
  
  return (
    <>
      <div className="App">
        {
          connected ? (
            <>
               <h3>Counter: {counter?.toFixed(0)}</h3>
              <button style={buttonStyle} onClick={increment}>
                Increment
              </button>

              <button style={buttonStyle} onClick={btnRegBegin}>
              Register
              </button>

              <button style={buttonStyle} onClick={btnAuthBegin}>
              Authenticate
              </button>

            </>
          ) : (
            <button style={buttonStyle} onClick={connect}>Connect</button>
          )
        }
      </div>
    </>
  );
}

export default App;

const buttonStyle = {
  borderRadius: "48px",
  marginTop: "10px",
  backgroundColor: "#03ffc8",
  fontSize: "20px",
  fontWeight: "600",
  color: "rgba(0, 0, 0, .88)",
  border: "none",
  outline: "none",
  height: "60px",
  width: "400px",
  cursor: "pointer"
}
