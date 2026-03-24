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
Abra o arquivo `/client/index.html` e substitua no script:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=SUA_CHAVE_AQUI&libraries=places"></script>
```

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
*   **⚙️ Estabilidade & Logs**: Implementação de sistema fail-safe para carregamento de dados e logs de erro automatizados.

---

## 📝 Licença
Este projeto foi desenvolvido como um MVP inteligente para gestão financeira doméstica. Sinta-se à vontade para expandir!

---
*Desenvolvido com 💚 e Inteligência Artificial.*