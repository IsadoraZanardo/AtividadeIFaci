"use client";

import { useCallback, useEffect, useState } from "react";
import Botao from "./components/Botao";
import Card from "./components/Card";

type DeviceStatus = "online" | "offline" | "alerta";

interface Dispositivo {
  id: string;
  nome: string;
  statusDispositivo: DeviceStatus;
  conexaoAtiva: boolean;
  travaLiberada: boolean;
  ultimaAtualizacao?: string;
  sensores: {
    temperatura: number;
    pressao: number;
    umidade: number;
    sensorPresenca: boolean;
    releSeguranca: boolean;
  };
}

const API_URL = "http://localhost:8081";

const statusStyle: Record<DeviceStatus, string> = {
  online: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  offline: "bg-slate-200 text-slate-700 hover:bg-slate-300",
  alerta: "bg-amber-100 text-amber-700 hover:bg-amber-200",
};

const formatarDispositivo = (
  item: any,
  index: number
): Dispositivo => {
  if (item?.sensores) {
    return {
      id: item.id || `EQP-${String(index + 1).padStart(3, "0")}`,
      nome: item.nome || `Dispositivo ${index + 1}`,
      statusDispositivo:
        item.statusDispositivo ||
        (item.conexaoAtiva ? "online" : "offline"),
      conexaoAtiva: Boolean(item.conexaoAtiva),
      travaLiberada: Boolean(item.travaLiberada),
      ultimaAtualizacao: item.ultimaAtualizacao,

      sensores: {
        temperatura: Number(item.sensores.temperatura ?? 0),
        pressao: Number(item.sensores.pressao ?? 0),
        umidade: Number(item.sensores.umidade ?? 0),
        sensorPresenca: Boolean(item.sensores.sensorPresenca),
        releSeguranca: Boolean(item.sensores.releSeguranca),
      },
    };
  }

  return {
    id: item?.Codigo || `EQP-${String(index + 1).padStart(3, "0")}`,

    nome: item?.Sensor
      ? `Dispositivo ${item.Sensor}`
      : `Dispositivo ${index + 1}`,

    statusDispositivo: item?.Status ? "online" : "offline",

    conexaoAtiva: Boolean(item?.Status),

    travaLiberada: false,

    ultimaAtualizacao: new Date().toISOString(),

    sensores: {
      temperatura: item?.Sensor === "Temperatura" ? 25 : 0,
      pressao: item?.Sensor === "Pressão" ? 2.4 : 0,
      umidade: item?.Sensor === "Umidade" ? 54 : 0,
      sensorPresenca: Boolean(item?.Status),
      releSeguranca: false,
    },
  };
};

const valorBooleano = (
  valor: boolean,
  textAtivo = "Ativo",
  textInativo = "Inativo"
) => (valor ? textAtivo : textInativo);

export default function Home() {
  const [dadosBackend, setDadosBackend] = useState<Dispositivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null);

  const pegaDados = useCallback(async () => {
    try {
      setCarregando(true);
      const resposta = await fetch(`${API_URL}/devices`);
      const respostaJSON = await resposta.json();
      const lista = Array.isArray(respostaJSON)
        ? respostaJSON.map(formatarDispositivo)
        : [];
      setDadosBackend(lista);
    } catch (error) {
      console.error("Falha na requisição:", error);
    } finally {
      setCarregando(false);
    }
  }, []);

  const deletaTudo = async () => {
    const confirmar = window.confirm(
      "Tem certeza que deseja deletar TODOS os dispositivos?"
    );
    if (!confirmar) return;

    try {
      setAcaoEmAndamento("limpar");
      await fetch(`${API_URL}/destroy`, { method: "DELETE" });
      setDadosBackend([]);
      alert("Dados excluídos com sucesso!");
    } catch (error) {
      console.error("Falha na requisição:", error);
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const alternarAcao = async (id: string, tipo: "trava" | "conexao") => {
    try {
      setAcaoEmAndamento(`${tipo}-${id}`);
      await fetch(`${API_URL}/devices/${id}/${tipo}`, { method: "PATCH" });
      await pegaDados();
    } catch (error) {
      console.error("Falha ao atualizar dispositivo:", error);
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const tratarAlternarConexao = async (item: Dispositivo) => {
    try {
      setAcaoEmAndamento(`conexao-${item.id}`);
      await fetch(`${API_URL}/devices/${item.id}/conexao`, { method: "PATCH" });

      setDadosBackend((estadoAnterior) =>
        estadoAnterior.map((dispositivo) => {
          if (dispositivo.id !== item.id) return dispositivo;
          const novaConexao = !dispositivo.conexaoAtiva;
          return {
            ...dispositivo,
            conexaoAtiva: novaConexao,
            statusDispositivo: novaConexao ? "online" : "offline",
          };
        })
      );
    } catch (error) {
      console.error("Erro ao alterar conexão:", error);
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  useEffect(() => {
    pegaDados();
  }, [pegaDados]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <section className="max-w-7xl mx-auto px-6 py-10">
        {/* Topo da página */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              INTERFACE INDUSTRIAL
            </p>
            <h1 className="text-3xl md:text-4xl font-bold">Tela de Equipamentos</h1>
          </div>
          <div className="flex gap-3">
            <Botao nome="🔄️" estilo="secundario" onClick={pegaDados} disabled={carregando} />
            <Botao nome="🗑️" estilo="deletar" onClick={deletaTudo} disabled={acaoEmAndamento === "limpar"} />
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <p className="text-sm text-slate-500">Dispositivos</p>
            <p className="text-3xl font-bold mt-2">{dadosBackend.length}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Relés Ligados</p>
            <p className="text-3xl font-bold mt-2">
              {dadosBackend.filter((item) => item.statusDispositivo === "online").length}
            </p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Conexões Ligadas</p>
            <p className="text-3xl font-bold mt-2">
              {dadosBackend.filter((item) => item.conexaoAtiva).length}
            </p>
          </Card>
        </div>

        {carregando && dadosBackend.length === 0 && (
          <Card><p>Carregando dispositivos...</p></Card>
        )}

        {!carregando && dadosBackend.length === 0 && (
          <Card>
            <p className="font-semibold">Nenhum dispositivo encontrado :(</p>
            <p className="text-slate-500 mt-2">Necessário enviar os dados para o backend</p>
          </Card>
        )}

        {/* Lista de Equipamentos */}
        <div className="grid gap-6 lg:grid-cols-2">
          {dadosBackend.map((item) => (
            <Card key={item.id} title={item.nome}>
              <div className="flex flex-col gap-5">
                
                {/* ID e Botão Superior (ONLINE / OFFLINE) */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">ID do dispositivo</p>
                    <p className="font-bold text-lg">{item.id}</p>
                  </div>

                  <button
                    onClick={() => tratarAlternarConexao(item)}
                    disabled={acaoEmAndamento === `conexao-${item.id}`}
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-150 active:scale-95 disabled:opacity-50 ${statusStyle[item.statusDispositivo]}`}
                  >
                    {item.statusDispositivo.toUpperCase()}
                  </button>
                </div>

                {/* Grid de Sensores */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Temperatura</p>
                    <p className="text-2xl font-bold">{item.sensores.temperatura.toFixed(1)} °C</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Pressão</p>
                    <p className="text-2xl font-bold">{item.sensores.pressao.toFixed(1)} bar</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Umidade</p>
                    <p className="text-2xl font-bold">{item.sensores.umidade.toFixed(0)} %</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Sensor de presença</p>
                    <p className="text-xl font-bold">{valorBooleano(item.sensores.sensorPresenca)}</p>
                  </div>

                  {/* Relé de segurança com o botão Ligar/Desligar corrigido */}
                  <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Relé de segurança</p>
                      <p className="text-xl font-bold mt-1">{valorBooleano(item.travaLiberada)}</p>
                    </div>
                    <div>
                      <button
                        onClick={() => alternarAcao(item.id, "trava")}
                        disabled={acaoEmAndamento === `trava-${item.id}`}
                        className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-150 active:scale-95 disabled:opacity-50 ${
                          item.travaLiberada
                            ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }`}
                      >
                        {item.travaLiberada ? "DESLIGAR" : "LIGAR"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rodapé da última atualização */}
                <p className="text-sm text-slate-500">
                  Última atualização:{" "}
                  {item.ultimaAtualizacao
                    ? new Date(item.ultimaAtualizacao).toLocaleString("pt-BR")
                    : "Sem registro"}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}