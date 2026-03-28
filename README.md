# 🛒 FeirAI - Gestão Inteligente de Feiras (Full-Stack)

O **FeirAI** é uma aplicação completa para gestão de compras domésticas, desenvolvida com foco em economia real através de inteligência de dados e geolocalização. O sistema não apenas lista seus produtos, mas aprende com seu histórico para indicar onde cada item é mais barato e qual o melhor custo-benefício geográfico.

## 🚀 Funcionalidades Principais

*   **Carrinho Blindado (Home)**: Adicione itens à sua feira em tempo real com cálculo automático de total. O carrinho é persistente (blindado); se você fechar o app por acidente, ele pergunta se deseja continuar de onde parou.
*   **Insights de IA**: Ao selecionar um produto, o assistente analisa seu histórico e sugere o local onde você pagou mais barato anteriormente.
*   **Geolocalização (Maps)**: Calcula a distância entre você e os supermercados para avaliar o custo de deslocamento vs. economia no produto.
*   **FeirAI Indica**: Monte sua lista de compras desejada e a IA gera um roteiro otimizado, separando os itens pelos locais que compensam mais financeiramente.
*   **Gestão de Produtos e Marcas**: Diferencie preços entre marcas do mesmo tipo de produto.
*   **Dashboards de Relatórios**: Gráficos de gastos por feira e categorias mais consumidas.
*   **Banco de Dados Permanente**: Utiliza SQLite para garantir que seus dados nunca se percam.

---

## 🛠️ Tecnologias Utilizadas

*   **Frontend**: React.js (Vite 5), Phosphor Icons, Chart.js.
*   **Backend**: Node.js + Express.
*   **Banco de Dados**: SQLite (Relacional).
*   **Integrações**: Google Maps JavaScript API & Google Places API.

---

## 🗺️ Guia de Configuração da API do Google Maps

Para que as funcionalidades de busca de endereços e geolocalização funcionem, você precisa de uma chave de API válida do Google.

### Como conseguir a sua chave:
1.  Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2.  Crie um novo projeto (ex: "FeirAI").
3.  Vá em **APIs e Serviços** > **Biblioteca** e ative:
    *   `Maps JavaScript API`
    *   `Places API`
4.  Vá em **Credenciais** e clique em **+ Criar Credenciais** > **Chave de API**.
5.  **IMPORTANTE (Faturamento)**: O Google exige que você vincule uma **Conta de Faturamento** (cartão de crédito) ao projeto. 
    *   **Custo**: Geralmente é **GRÁTIS** para uso pessoal. O Google oferece um crédito recorrente de **$200 dólares/mês**. Você só pagará algo se fizer milhares de buscas por dia.

### Onde colocar a chave no projeto:
Nós usamos um proxy no servidor para que sua chave nunca fique visível para o usuário final.
1.  Na raíz do projeto, crie um arquivo chamado `.env` (ou copie o `.env.example`).
2.  Preencha com sua chave:
```env
GOOGLE_MAPS_API_KEY=SUA_CHAVE_AQUI
```
3.  Reinicie o Docker: `docker-compose up -d --build`.

---

## 💻 Como Rodar o Projeto Localmente

### 1. Clonar e Instalar
```bash
# Entre na pasta do backend e instale
cd server
npm install

# Entre na pasta do frontend e instale
cd ../client
npm install
```

### 2. Iniciar o Backend (API)
Na raiz do projeto ou na pasta `/server`:
```bash
node server/server.js
```
*O servidor rodará na porta **3005**.*

### 3. Iniciar o Frontend (UI)
Na pasta `/client`:
```bash
npm run dev
```

Abra o endereço indicado (ex: `http://localhost:5173`) no seu navegador ou celular na mesma rede.

---

## 📈 Notas de Melhorias (Changelog)

### [24/03/2026] - Inteligência de Compra & Otimização de Roteiro
*   **🛒 Lista Inteligente**: Novo sistema de planejamento que agrupa automaticamente os itens pelo melhor preço histórico por supermercado.
*   **⚡ Exportação p/ Feira**: Inicie uma compra a partir da lista planejada com um clique; o sistema configura o local e carrega os preços sugeridos instantaneamente.
*   **📊 Tendências de Consumo**: Dashboard de relatórios agora indica o melhor dia da semana para comprar cada item com base em IA histórica.
*   **🧠 Insights de Economia**: Relatório proativo que mostra onde estão as maiores oportunidades de economia por produto.
*   **📱 UI Responsiva & Refinada**: Redesign completo dos modais de edição e histórico para perfeita visualização em dispositivos móveis.
### [24/03/2026] - Persistência & Segurança de Dados
*   **🛡️ Persistência Inteligente**: Itens na Lista de Economia agora são mantidos no banco de dados mesmo após serem exportados para a feira ativa. Eles só são removidos definitivamente quando a compra é **finalizada com sucesso** no histórico, garantindo que nenhum planejamento seja perdido caso a feira seja abandonada.
*   **🎯 Rastreamento de Itens**: Vinculação interna de IDs que garante que apenas os itens efetivamente cobrados no checkout sejam baixados da sua lista de planejamento original.

---

### [24/03/2026] - Planejamento & Proteção Legal (v1.1)
*   **⚖️ Proteção de Código**: Adição da licença **AGPLv3**, garantindo que o projeto permaneça aberto mas protegendo contra exploração comercial indevida sem reciprocidade.
*   **📱 Roadmap Mobile**: Lançamento da campanha "APP EM BREVE" com banner interativo na interface, preparando o público para a versão comercial.
*   **🗺️ Mapeamento Arquitetural**: Documentação técnica completa das rotas e esquemas para facilitar futuras integrações.

### [25/03/2026] - Sincronização em Nuvem (v1.2)
*   **🔄 Sync Nuvem (Smart Sync)**: Implementação de lógica de sincronização bidirecional inteligente. O sistema agora compara o banco local com o backup mais recente e decide automaticamente se deve puxar os dados da nuvem ou enviar os locais.
*   **📱 Retomada Multi-dispositivo**: Agora você pode iniciar uma feira no celular e terminá-la no computador. O sistema detecta sessões em aberto na nuvem e permite retomá-las instantaneamente.
*   **⚡ Auto-Sync em Tempo Real**: Cada alteração feita (adicionar produto, editar local) dispara um backup automático para garantir que todos os seus dispositivos estejam sempre atualizados.

### [26/03/2026] - Correção de Histórico & Fusos Horários (v1.3)
*   **⏰ Estabilidade de Datas**: Correção definitiva do bug de "salto" de horário (fuso horário) na edição de compras do histórico. Agora o sistema utiliza strings locais desconectadas durante a edição para evitar reversões indesejadas para o formato UTC.
*   **🕒 Input de Tempo Preciso**: Otimização do componente de formulário para garantir que o horário visualizado no `datetime-local` seja exatamente o que será salvo no banco de dados.

### [28/03/2026] - Planejamento Inteligente Multilistas (v1.4)
*   **📂 Múltiplas Listas de Planejamento**: Agora é possível criar e gerenciar listas separadas por nome (ex: "Churrasco", "Casa", "Chácara") no módulo de Planejamento Inteligente.
*   **🧠 Agrupamento em Tempo Real**: Conforme você adiciona produtos no planejamento, o sistema os organiza automaticamente sob o supermercado onde o item é historicamente mais barato.
*   **🔄 Fluxo de Confirmação Interativo**: Ao tentar guardar um item do carrinho na lista de planejamento, o FeirAI agora avisa se o item já está planejado para aquele local e oferece a opção de somar as quantidades automaticamente.
*   **🏗️ Refatoração de Banco de Dados**: Evolução do esquema SQLite para suportar metadados de listas e fusão inteligente de quantidades duplicadas.
*   **🎨 Refinamento UI/UX (v1.5)**: Botão de ação renomeado para "Guardar na Lista" para maior clareza e implementação da identidade visual oficial com o novo Favicon Emerald.

---

## 🤝 Comunidade & Suporte

Tem dúvidas sobre como subir o projeto? Possui sugestões de novas funcionalidades ou quer trocar uma ideia sobre o desenvolvimento?

Eu adoraria ouvir o seu feedback! 
Para garantir que eu receba sua mensagem rapidamente, **entre no meu site de portfólio no Vercel** onde possuo um formulário dedicado para isso:

👉 **[omarcilioaguiar.vercel.app](https://omarcilioaguiar.vercel.app)**

Lá você também pode conferir outros projetos em que estou trabalhando e entrar em contato direto para parcerias ou colaborações.

---

## 📝 Licença
Este projeto é distribuído sob a licença **GNU Affero General Public License v3.0 (AGPL-3.0)**. Isso permite o uso e modificação, mas exige que versões modificadas (incluindo serviços SaaS) também sejam abertas. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.

---
*Desenvolvida com Auxílio de IA + Validações e Implementações Inteligentes por Mim.*