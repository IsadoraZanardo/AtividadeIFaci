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
  const dadosSensores = item?.sensores || item?.Sensors || item?.sensor;

  if (item && dadosSensores) {
    return {
      id: item.id || item.Codigo || String(index + 1).padStart(4, "0"),
      nome: item.nome || item.Nome || `Dispositivo ${index + 1}`,
      statusDispositivo:
        item.statusDispositivo ||
        (item.conexaoAtiva || item.Status ? "online" : "offline"),
      conexaoAtiva: Boolean(item.conexaoAtiva ?? item.Status ?? true),
      travaLiberada: Boolean(item.travaLiberada),
      ultimaAtualizacao: item.ultimaAtualizacao || new Date().toISOString(),
      sensores: {
        temperatura: Number(dadosSensores.temperatura ?? dadosSensores.Temperatura ?? 0),
        pressao: Number(dadosSensores.pressao ?? dadosSensores.Pressão ?? dadosSensores.pressao ?? 0),
        umidade: Number(dadosSensores.umidade ?? dadosSensores.Umidade ?? 0),
        sensorPresenca: Boolean(dadosSensores.sensorPresenca ?? dadosSensores.Status ?? false),
        releSeguranca: Boolean(dadosSensores.releSeguranca ?? false),
      },
    };
  }

  return {
    id: item?.id || item?.Codigo || String(index + 1).padStart(4, "0"),
    nome: item?.Sensor ? `Dispositivo ${item.Sensor}` : `Dispositivo ${index + 1}`,
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
  
  // Estados para Edição
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const [valoresEditados, setValoresEditados] = useState<Partial<Dispositivo>>({});

  // Estados para Criação de Novo Item
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [novoDispositivo, setNovoDispositivo] = useState<Partial<Dispositivo>>({});

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

  const deletaDispositivo = async (id: string) => {
    const confirmar = window.confirm(`Deseja excluir o dispositivo com ID ${id}?`);
    if (!confirmar) return;

    try {
      setAcaoEmAndamento(`deletar-${id}`);
      await fetch(`${API_URL}/devices/${id}`, { method: "DELETE" });
      setDadosBackend((estadoAnterior) =>
        estadoAnterior.filter((dispositivo) => dispositivo.id !== id)
      );
    } catch (error) {
      console.error("Erro ao deletar dispositivo:", error);
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const iniciarCriacao = () => {
    setIdEmEdicao(null);
    setNovoDispositivo({
      id: String(dadosBackend.length + 1).padStart(4, "0"),
      nome: "Novo Equipamento",
      statusDispositivo: "online",
      conexaoAtiva: true,
      travaLiberada: false,
      sensores: {
        temperatura: 0,
        pressao: 0,
        umidade: 0,
        sensorPresenca: false,
        releSeguranca: false,
      },
    });
    setCriandoNovo(true);
  };

  const salvarNovoDispositivo = async () => {
    try {
      setAcaoEmAndamento("criando");
      
      const estruturaEnvio = {
        ...novoDispositivo,
        ultimaAtualizacao: new Date().toISOString()
      };

      const resposta = await fetch(`${API_URL}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estruturaEnvio),
      });

      const respostaJSON = await resposta.json();
      
      // BLINDAGEM: Se a resposta do backend vier vazia ou mal formatada,
      // usamos os dados que estão na tela (estruturaEnvio) como plano B.
      const dadosParaFormatar = respostaJSON && (respostaJSON.id || respostaJSON.sensores || respostaJSON.Sensor)
        ? respostaJSON 
        : estruturaEnvio;

      const itemFormatado = formatarDispositivo(dadosParaFormatar, dadosBackend.length);

      setDadosBackend((estadoAnterior) => [itemFormatado, ...estadoAnterior]);
      setCriandoNovo(false);
    } catch (error) {
      console.error("Erro ao criar dispositivo:", error);
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const iniciarEdicao = (dispositivo: Dispositivo) => {
    setCriandoNovo(false);
    setIdEmEdicao(dispositivo.id);
    setValoresEditados({ ...dispositivo });
  };

  const salvarEdicao = async () => {
    if (!idEmEdicao || !valoresEditados) return;

    try {
      setAcaoEmAndamento(`salvar-${idEmEdicao}`);
      
      const dispositivoAtualizado = {
        ...valoresEditados,
        ultimaAtualizacao: new Date().toISOString()
      };

      await fetch(`${API_URL}/devices/${idEmEdicao}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dispositivoAtualizado),
      });

      setDadosBackend((estadoAnterior) =>
        estadoAnterior.map((disp) => (disp.id === idEmEdicao ? (dispositivoAtualizado as Dispositivo) : disp))
      );

      setIdEmEdicao(null);
    } catch (error) {
      console.error("Erro ao salvar dispositivo:", error);
    } finally {
      setAcaoEmAndamento(null);
    }
  };

  const alternarAcao = async (id: string, tipo: "trava" | "conexao") => {
    try {
      setAcaoEmAndamento(`${tipo}-${id}`);
      await fetch(`${API_URL}/devices/${id}/${tipo}`, { method: "PATCH" });
      
      setDadosBackend((estadoAnterior) =>
        estadoAnterior.map((dispositivo) => {
          if (dispositivo.id !== id) return dispositivo;
          if (tipo === "trava") {
            return { ...dispositivo, travaLiberada: !dispositivo.travaLiberada };
          }
          return dispositivo;
        })
      );
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
              ISADORA ZANARDO - INTERFACES INDUSTRIAIS
            </p>
            <h1 className="text-3xl md:text-4xl font-bold">Tela de Equipamentos</h1>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={iniciarCriacao} 
              disabled={carregando || criandoNovo}
              className="px-4 py-2 rounded bg-slate-200 text-slate-700 font-medium text-sm disabled:opacity-50"
            >
              ➕ Novo Item
            </button>
            <button 
              onClick={deletaTudo} 
              disabled={acaoEmAndamento === "limpar"}
              className="px-4 py-2 rounded bg-slate-200 text-slate-700 font-medium text-sm disabled:opacity-50"
            >
              🗑️
            </button>
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
              {dadosBackend.filter((item) => item.travaLiberada).length}
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

        {/* Formulário de Criação de Novo Item */}
        {criandoNovo && (
          <div className="relative mb-6 border-2 border-dashed border-slate-300 rounded-xl p-1 bg-white">
            <div className="absolute top-3 right-3 z-10 flex gap-2">
              <button
                onClick={salvarNovoDispositivo}
                disabled={acaoEmAndamento === "criando"}
                className="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors active:scale-95"
              >
                Salvar
              </button>
              <button
                onClick={() => setCriandoNovo(false)}
                className="px-2.5 py-1 rounded bg-emerald-55 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors active:scale-95"
              >
                Cancelar
              </button>
            </div>

            <Card title="">
              <div className="flex flex-col gap-5 pt-2">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="w-full md:max-w-xs">
                    <div className="flex flex-col gap-1 pr-24">
                      <label className="text-xs font-bold text-slate-500 uppercase">Nome do Novo Equipamento</label>
                      <input
                        type="text"
                        value={novoDispositivo.nome || ""}
                        onChange={(e) => setNovoDispositivo({ ...novoDispositivo, nome: e.target.value })}
                        className="w-full text-base font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 focus:outline-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {/* Temperatura */}
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Temperatura</p>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.1"
                        value={novoDispositivo.sensores?.temperatura ?? ""}
                        onChange={(e) => setNovoDispositivo({
                          ...novoDispositivo,
                          sensores: {
                            temperatura: Number(e.target.value),
                            pressao: novoDispositivo.sensores?.pressao ?? 0,
                            umidade: novoDispositivo.sensores?.umidade ?? 0,
                            sensorPresenca: novoDispositivo.sensores?.sensorPresenca ?? false,
                            releSeguranca: novoDispositivo.sensores?.releSeguranca ?? false,
                          }
                        })}
                        className="w-20 text-xl font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5"
                      />
                      <span className="font-bold">°C</span>
                    </div>
                  </div>

                  {/* Pressão */}
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Pressão</p>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.1"
                        value={novoDispositivo.sensores?.pressao ?? ""}
                        onChange={(e) => setNovoDispositivo({
                          ...novoDispositivo,
                          sensores: {
                            temperatura: novoDispositivo.sensores?.temperatura ?? 0,
                            pressao: Number(e.target.value),
                            umidade: novoDispositivo.sensores?.umidade ?? 0,
                            sensorPresenca: novoDispositivo.sensores?.sensorPresenca ?? false,
                            releSeguranca: novoDispositivo.sensores?.releSeguranca ?? false,
                          }
                        })}
                        className="w-20 text-xl font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5"
                      />
                      <span className="font-bold">bar</span>
                    </div>
                  </div>

                  {/* Umidade */}
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Umidade</p>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        value={novoDispositivo.sensores?.umidade ?? ""}
                        onChange={(e) => setNovoDispositivo({
                          ...novoDispositivo,
                          sensores: {
                            temperatura: novoDispositivo.sensores?.temperatura ?? 0,
                            pressao: novoDispositivo.sensores?.pressao ?? 0,
                            umidade: Number(e.target.value),
                            sensorPresenca: novoDispositivo.sensores?.sensorPresenca ?? false,
                            releSeguranca: novoDispositivo.sensores?.releSeguranca ?? false,
                          }
                        })}
                        className="w-20 text-xl font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5"
                      />
                      <span className="font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {!carregando && dadosBackend.length === 0 && !criandoNovo && (
          <Card>
            <p className="font-semibold">Nenhum dispositivo encontrado :(</p>
            <p className="text-slate-500 mt-2">Clique em "+ Novo Item" para cadastrar um equipamento</p>
          </Card>
        )}

        {/* Lista de Equipamentos */}
        <div className="grid gap-6 lg:grid-cols-2">
          {dadosBackend.map((item) => {
            const estáEditando = idEmEdicao === item.id;

            return (
              <div key={item.id} className="relative group">
                
                {/* Botões de Ação */}
                <div className="absolute top-3 right-3 z-10 flex gap-2">
                  {!estáEditando ? (
                    <>
                      <button
                        onClick={() => iniciarEdicao(item)}
                        title="Editar dispositivo"
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors text-sm font-normal active:scale-95"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deletaDispositivo(item.id)}
                        disabled={acaoEmAndamento === `deletar-${item.id}`}
                        title="Excluir dispositivo"
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors text-sm font-normal disabled:opacity-50 active:scale-95"
                      >
                        ❌
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={salvarEdicao}
                        disabled={acaoEmAndamento === `salvar-${item.id}`}
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors active:scale-95"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setIdEmEdicao(null)}
                        className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors active:scale-95"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>

                <Card title={estáEditando ? "" : item.nome}>
                  <div className="flex flex-col gap-5 pt-2">
                    
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="w-full md:max-w-xs">
                        {estáEditando ? (
                          <div className="flex flex-col gap-1 pr-24">
                            <label className="text-xs font-bold text-slate-500 uppercase">Nome do Equipamento</label>
                            <input
                              type="text"
                              value={valoresEditados.nome || ""}
                              onChange={(e) => setValoresEditados({ ...valoresEditados, nome: e.target.value })}
                              className="w-full text-base font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 focus:outline-blue-500"
                            />
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-slate-500">ID do dispositivo</p>
                            <p className="font-bold text-lg">{item.id}</p>
                          </>
                        )}
                      </div>

                      {!estáEditando && (
                        <div className="mr-16 md:mr-0">
                          <button
                            onClick={() => tratarAlternarConexao(item)}
                            disabled={acaoEmAndamento === `conexao-${item.id}`}
                            className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-150 active:scale-95 disabled:opacity-50 ${statusStyle[item.statusDispositivo]}`}
                          >
                            {item.statusDispositivo.toUpperCase()}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Grid de Sensores */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      
                      {/* Temperatura */}
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Temperatura</p>
                        {estáEditando ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="number"
                              step="0.1"
                              value={valoresEditados.sensores?.temperatura ?? 0}
                              onChange={(e) => setValoresEditados({
                                ...valoresEditados,
                                sensores: { ...valoresEditados.sensores!, temperatura: Number(e.target.value) }
                              })}
                              className="w-20 text-xl font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5"
                            />
                            <span className="font-bold">°C</span>
                          </div>
                        ) : (
                          <p className="text-2xl font-bold">{item.sensores.temperatura.toFixed(1)} °C</p>
                        )}
                      </div>

                      {/* Pressão */}
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Pressão</p>
                        {estáEditando ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="number"
                              step="0.1"
                              value={valoresEditados.sensores?.pressao ?? 0}
                              onChange={(e) => setValoresEditados({
                                ...valoresEditados,
                                sensores: { ...valoresEditados.sensores!, pressao: Number(e.target.value) }
                              })}
                              className="w-20 text-xl font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5"
                            />
                            <span className="font-bold">bar</span>
                          </div>
                        ) : (
                          <p className="text-2xl font-bold">{item.sensores.pressao.toFixed(1)} bar</p>
                        )}
                      </div>

                      {/* Umidade */}
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Umidade</p>
                        {estáEditando ? (
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="number"
                              value={valoresEditados.sensores?.umidade ?? 0}
                              onChange={(e) => setValoresEditados({
                                ...valoresEditados,
                                sensores: { ...valoresEditados.sensores!, umidade: Number(e.target.value) }
                              })}
                              className="w-20 text-xl font-bold bg-white border border-slate-300 rounded px-1.5 py-0.5"
                            />
                            <span className="font-bold">%</span>
                          </div>
                        ) : (
                          <p className="text-2xl font-bold">{item.sensores.umidade.toFixed(0)} %</p>
                        )}
                      </div>

                      {/* Sensor de Presença */}
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Sensor de presença</p>
                        <p className="text-xl font-bold mt-1">{valorBooleano(item.sensores.sensorPresenca)}</p>
                      </div>

                      {/* Relé de segurança */}
                      <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-500">Relé de segurança</p>
                          <p className="text-xl font-bold mt-1">{valorBooleano(item.travaLiberada)}</p>
                        </div>
                        {!estáEditando && (
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
                              {item.travaLiberada ? "Desligar" : "Ligar"}
                            </button>
                          </div>
                        )}
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
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}