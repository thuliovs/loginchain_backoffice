import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import Image from "next/image";
import "react-toastify/dist/ReactToastify.css";
import useMessages from "../hooks/useMessages";
import { FiAlertTriangle } from "react-icons/fi"; // Ícone de erro

export default function Auth() {
  const messages = useMessages();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [blockchainStatus, setBlockchainStatus] = useState("checking"); // "online" | "offline" | "checking"
  const [networkError, setNetworkError] = useState(false); // Se true, mostra erro de conexão

  useEffect(() => {
    const checkBlockchainStatus = async () => {
      try {
        const { data, status } = await axios.get(`${process.env.NEXT_PUBLIC_APIS_URL_REMOTE}/api/blockchain-status`, {
          validateStatus: () => true // Permite capturar qualquer status sem gerar erro
        });

        if (status === 200 && data.status === "online") {
          setBlockchainStatus("online");
          setNetworkError(false);
        } else if (status === 200 && data.status === "offline") {
          setBlockchainStatus("offline");
          setNetworkError(false);
        } else {
          setNetworkError(true); // Define erro de conexão com o servidor
        }
      } catch {
        setNetworkError(true); // Define erro de conexão com o servidor
      }
    };

    checkBlockchainStatus();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error(messages.auth?.no_wallet_detected);
      return;
    }

    if (networkError) {
      toast.error(messages.auth?.network_error);
      return;
    }

    if (blockchainStatus !== "online") {
      toast.error(messages.auth?.blockchain_offline);
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      const message = `${messages.auth?.auth_request} - ${new Date().toISOString()}`;
      const signature = await signer.signMessage(message);

      setIsAuthenticating(true);

      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_APIS_URL_REMOTE}/api/loginBlockchain`,
        { walletAddress, message, signature },
        { withCredentials: true }
      );

      if (data.success) {
        toast.success(messages.auth?.login_success);
        setTimeout(() => router.push("/welcome"), 2000);
      } else {
        toast.error(data.error || messages.auth?.login_error);
        setIsAuthenticating(false);
      }
    } catch (error) {
      let errorMessage = messages.auth?.wallet_error;
      if (error.message.includes("Network Error")) {
        errorMessage = messages.auth?.network_error;
        setNetworkError(true); // Mostra o erro de rede no painel inferior
      }
      toast.error(error.response?.data?.error || errorMessage);
      setIsAuthenticating(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black text-white relative">
      {isAuthenticating && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-white mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-white">{messages.auth?.loading_auth}</p>
          </div>
        </div>
      )}

      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 border border-gray-700 flex flex-col items-center">
        {/* ✅ Logo e título */}
        <div className="flex items-center space-x-3 mb-4">
          <Image src="/nextjs-icon.svg" alt="Next.js Logo" width={40} height={40} />
          <h2 className="text-2xl font-semibold">{messages.auth?.blockchain_login}</h2>
        </div>

        {/* ✅ Botão de login */}
        <button
          onClick={connectWallet}
          className={`py-2 px-4 rounded font-bold mt-4 ${
            blockchainStatus === "offline" || networkError
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-700 text-white"
          }`}
          disabled={blockchainStatus === "offline" || networkError || loading}
        >
          {loading ? messages.auth?.validating_auth : messages.auth?.login_button}
        </button>

        <ToastContainer position="top-right" autoClose={3000} />
      </div>

      {/* ✅ Indicador LED da Blockchain no canto inferior direito */}
      <div className="absolute bottom-5 right-5 flex items-center space-x-2">
        {networkError && <FiAlertTriangle className="text-red-500 text-xl animate-bounce" />}

        {!networkError && (
          <span
            className={`w-3 h-3 rounded-full ${
              blockchainStatus === "online" ? "bg-green-500 animate-pulse" : "bg-red-500 animate-pulse"
            }`}
          />
        )}

        <p className="text-sm text-gray-300">
          {networkError
            ? messages.auth?.network_error // ❌ Erro de Ligação ao Servidor
            : blockchainStatus === "online"
            ? messages.auth?.blockchain_online // ✅ Blockchain Online
            : messages.auth?.blockchain_offline} {/* 🔴 Blockchain Offline */}
        </p>
      </div>
    </div>
  );
}
