# 🔮 TENSION: 10 Веток Будущего Развития

> **Основано на:** текущей архитектуре Tension + концепциях LLM Council (Karpathy)

---

## 📊 Контекст

**Tension** — это пространственный интерфейс для работы с LLM, где пользователь строит "карту мыслей" вместо линейного диалога.

**LLM Council** (Karpathy) — это 3-стадийная система консенсуса, где несколько LLM:
1. **Divergence** — генерируют независимые ответы
2. **Convergence** — анонимно оценивают друг друга
3. **Synthesis** — Chairman синтезирует финальный ответ

**Синергия:** Tension уже имеет визуальное ветвление (1-4 branches). Интеграция Council паттерна превратит его в **визуальную систему мультимодельного консенсуса**.

---

## 🌳 10 ВЕТОК РАЗВИТИЯ

---

### 1. 🏛️ COUNCIL MODE — Визуальный Совет LLM

**Концепция:**
Каждая нода может запускать не одну модель, а "Совет" из нескольких LLM. Пользователь видит процесс дебатов визуально.

**Реализация:**
```
┌─────────────────────────────────────────────────────────────┐
│                     USER PROMPT                              │
│              "Объясни квантовую запутанность"               │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │  GPT-4  │   │ Claude  │   │ Gemini  │   ← Stage 1: Divergence
   │ Response│   │ Response│   │ Response│
   └────┬────┘   └────┬────┘   └────┬────┘
        │             │             │
        └─────────────┼─────────────┘
                      ▼
              ┌───────────────┐
              │  PEER REVIEW  │   ← Stage 2: Convergence
              │  (Anonymous)  │
              │ Rankings: A>C>B│
              └───────┬───────┘
                      ▼
              ┌───────────────┐
              │   CHAIRMAN    │   ← Stage 3: Synthesis
              │ Final Answer  │
              └───────────────┘
```

**Фичи:**
- Визуализация всех 3 стадий на холсте
- Анимация "голосования" между нодами
- Цветовая индикация качества ответов (зелёный → красный)
- Возможность "вето" — пользователь отклоняет ответ модели

**Интеграция с Tension:**
- Новый тип ноды: `CouncilNode`
- Branches показывают ответы разных моделей
- Deep Level = количество раундов дебатов

---

### 2. 🔀 MULTI-PROVIDER GATEWAY — Единый API для всех LLM

**Концепция:**
Абстракция над всеми LLM провайдерами через единый интерфейс (как OpenRouter в LLM Council).

**Поддерживаемые провайдеры:**
| Provider | Models | Особенности |
|----------|--------|-------------|
| OpenAI | GPT-4, GPT-4o, o1 | Лучший reasoning |
| Anthropic | Claude 3.5, Claude 4 | Длинный контекст |
| Google | Gemini 2.0, Gemini 3 | Мультимодальность |
| xAI | Grok 4 | Актуальность данных |
| Meta | Llama 3.3 | Open source |
| Mistral | Mixtral, Mistral Large | Европейский хостинг |
| Local | Ollama, LM Studio | Приватность |

**Архитектура:**
```typescript
// src/shared/lib/llm/gateway.ts
interface LLMGateway {
  query(model: ModelId, prompt: string): Promise<Response>;
  queryParallel(models: ModelId[], prompt: string): Promise<Response[]>;
  getAvailableModels(): ModelInfo[];
}

// Единый формат запроса
const response = await gateway.query('anthropic/claude-3.5-sonnet', prompt);
```

**Преимущества:**
- Смена модели без изменения кода
- Fallback при недоступности провайдера
- Сравнение цен и скорости в реальном времени

---

### 3. 🎯 SMART CONSENSUS — Автоматический выбор лучшего ответа

**Концепция:**
Система автоматически определяет "лучший" ответ на основе:
- Peer review от других моделей
- Semantic similarity (насколько ответы согласованы)
- Confidence scoring
- User feedback history

**Алгоритм:**
```
1. Получить N ответов от разных моделей
2. Каждая модель оценивает все ответы (анонимно)
3. Вычислить weighted score:
   - Peer ranking: 40%
   - Semantic coherence: 30%
   - Historical accuracy: 20%
   - Response length/quality: 10%
4. Выделить "победителя" визуально
5. Chairman синтезирует финальный ответ
```

**UI:**
- Ноды с высоким score получают золотую рамку
- Ноды с низким score — серые и полупрозрачные
- Анимация "короны" на лучшем ответе

---

### 4. 🌐 DEBATE MODE — Структурированные дебаты

**Концепция:**
Модели не просто отвечают, а **спорят** друг с другом по заданной теме.

**Формат:**
```
Round 1: Initial Positions
  - Model A: "За"
  - Model B: "Против"
  
Round 2: Rebuttals
  - Model A критикует Model B
  - Model B критикует Model A
  
Round 3: Final Arguments
  - Каждая модель суммирует позицию
  
Verdict: Chairman определяет победителя
```

**Use Cases:**
- Анализ сложных решений (pros/cons)
- Исследование противоречивых тем
- Тестирование аргументов перед презентацией

**Визуализация:**
```
        ┌─────────────┐
        │   ТЕМА      │
        │ "AI Ethics" │
        └──────┬──────┘
               │
    ┌──────────┴──────────┐
    ▼                     ▼
┌───────┐             ┌───────┐
│ PRO   │◄───────────►│ CONTRA│
│ GPT-4 │  Дебаты     │Claude │
└───┬───┘             └───┬───┘
    │                     │
    └──────────┬──────────┘
               ▼
        ┌─────────────┐
        │  VERDICT    │
        │  Gemini     │
        └─────────────┘
```

---

### 5. 📊 CONFIDENCE VISUALIZATION — Визуализация уверенности

**Концепция:**
Показывать не только ответ, но и **уверенность** модели в ответе.

**Метрики:**
- **Agreement Score** — насколько модели согласны друг с другом
- **Self-Consistency** — одинаковый ли ответ при повторных запросах
- **Hallucination Risk** — вероятность галлюцинации

**UI элементы:**
```
┌─────────────────────────────────────┐
│ Response                            │
│ "Квантовая запутанность — это..."   │
├─────────────────────────────────────┤
│ Confidence: ████████░░ 82%          │
│ Agreement:  ██████████ 95%          │
│ Risk:       ██░░░░░░░░ 15%          │
└─────────────────────────────────────┘
```

**Цветовая схема:**
- 🟢 90%+ — Высокая уверенность
- 🟡 70-90% — Средняя уверенность
- 🔴 <70% — Требует проверки

---

### 6. 🔄 ITERATIVE REFINEMENT — Итеративное улучшение

**Концепция:**
Автоматическое улучшение ответа через несколько раундов:

```
Round 1: Первичный ответ
Round 2: Критика и улучшение
Round 3: Финальная полировка
```

**Workflow:**
1. Модель A генерирует ответ
2. Модель B критикует: "Не хватает примеров"
3. Модель A улучшает ответ с учётом критики
4. Повторять до convergence или max_rounds

**Визуализация:**
- Каждый раунд = новый уровень глубины
- Стрелки показывают направление улучшений
- Diff view между версиями

---

### 7. 🧠 SPECIALIZED COUNCILS — Специализированные советы

**Концепция:**
Предустановленные "советы" для разных задач:

| Council | Модели | Задача |
|---------|--------|--------|
| **Code Review** | GPT-4, Claude, Codestral | Ревью кода |
| **Research** | Gemini, Claude, Perplexity | Исследования |
| **Creative** | GPT-4, Claude, Llama | Креатив |
| **Legal** | Claude, GPT-4 | Юридические вопросы |
| **Medical** | Med-PaLM, GPT-4 | Медицина (с дисклеймером) |

**UI:**
```
┌─────────────────────────────────────┐
│ Select Council:                     │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │🔧 Code  │ │📚Research│ │🎨Creative││
│ └─────────┘ └─────────┘ └─────────┘│
│ ┌─────────┐ ┌─────────┐            │
│ │⚖️ Legal │ │🏥Medical│            │
│ └─────────┘ └─────────┘            │
└─────────────────────────────────────┘
```

---

### 8. 📈 ANALYTICS DASHBOARD — Аналитика использования

**Концепция:**
Отслеживание эффективности разных моделей и стратегий.

**Метрики:**
- Какая модель чаще "выигрывает" в Council
- Среднее время ответа по провайдерам
- Стоимость запросов
- Качество ответов (user ratings)

**Dashboard:**
```
┌─────────────────────────────────────────────────┐
│ Model Performance (Last 30 days)                │
├─────────────────────────────────────────────────┤
│ GPT-4:    ████████████████░░░░ 78% wins         │
│ Claude:   ██████████████░░░░░░ 68% wins         │
│ Gemini:   ████████████░░░░░░░░ 58% wins         │
├─────────────────────────────────────────────────┤
│ Total Cost: $12.45 | Avg Latency: 2.3s          │
└─────────────────────────────────────────────────┘
```

---

### 9. 🔌 PLUGIN SYSTEM — Расширяемость

**Концепция:**
Возможность добавлять кастомные модели, оценщики и визуализации.

**Plugin Types:**
```typescript
interface TensionPlugin {
  type: 'model' | 'evaluator' | 'visualizer' | 'exporter';
  name: string;
  version: string;
  
  // Для model plugins
  query?(prompt: string): Promise<string>;
  
  // Для evaluator plugins
  evaluate?(responses: string[]): Promise<Ranking>;
  
  // Для visualizer plugins
  render?(node: Node): React.ReactNode;
}
```

**Примеры плагинов:**
- **Ollama Plugin** — локальные модели
- **RAG Plugin** — подключение к базам знаний
- **Fact-Check Plugin** — проверка фактов через поиск
- **Citation Plugin** — автоматические ссылки

---

### 10. 🤖 AUTONOMOUS AGENT MODE — Автономное исследование

**Концепция:**
Система сама исследует тему, создавая ветки и углубляясь.

**Workflow:**
```
1. Пользователь задаёт тему: "Квантовые компьютеры"
2. Agent Mode:
   - Генерирует 4 подтемы
   - Для каждой подтемы запускает Council
   - Определяет "интересные" направления
   - Углубляется в них автоматически
   - Останавливается при достижении depth limit
3. Пользователь получает готовую "карту знаний"
```

**Контроль:**
- Max depth (1-10)
- Max branches per node (1-4)
- Budget limit ($)
- Time limit (minutes)
- Stop words (темы для игнорирования)

**Визуализация:**
- Анимация "роста" графа в реальном времени
- Индикатор прогресса
- Возможность остановить в любой момент

---

## 🏗️ ПРИОРИТЕТЫ РЕАЛИЗАЦИИ

| Приоритет | Ветка | Сложность | Ценность |
|-----------|-------|-----------|----------|
| 🔴 P0 | Multi-Provider Gateway | Medium | Critical |
| 🔴 P0 | Council Mode | High | Critical |
| 🟠 P1 | Smart Consensus | Medium | High |
| 🟠 P1 | Confidence Visualization | Low | High |
| 🟡 P2 | Debate Mode | Medium | Medium |
| 🟡 P2 | Iterative Refinement | Medium | Medium |
| 🟢 P3 | Specialized Councils | Low | Medium |
| 🟢 P3 | Analytics Dashboard | Medium | Medium |
| 🔵 P4 | Plugin System | High | High |
| 🔵 P4 | Autonomous Agent Mode | Very High | Very High |

---

## 📐 АРХИТЕКТУРНЫЕ ИЗМЕНЕНИЯ

### Новые сущности:

```typescript
// src/entities/council/model/types.ts
interface Council {
  id: string;
  name: string;
  models: ModelId[];
  chairman: ModelId;
  evaluationStrategy: 'peer-review' | 'voting' | 'weighted';
}

// src/entities/model/model/types.ts
interface LLMModel {
  id: ModelId;
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'meta' | 'local';
  name: string;
  contextWindow: number;
  costPer1kTokens: number;
  capabilities: ('text' | 'code' | 'vision' | 'reasoning')[];
}

// src/entities/evaluation/model/types.ts
interface Evaluation {
  id: string;
  responseId: string;
  evaluatorModel: ModelId;
  ranking: number;
  critique: string;
  confidence: number;
}
```

### Новые виджеты:

```
src/widgets/
├── council-panel/       # Настройка Council
├── model-selector/      # Выбор моделей
├── confidence-badge/    # Индикатор уверенности
├── debate-view/         # Визуализация дебатов
└── analytics/           # Dashboard аналитики
```

---

## 🎯 ПЕРВЫЙ ШАГ: MVP Council Mode

**Минимальная реализация за 1 спринт:**

1. **Multi-Provider Gateway** (2 дня)
   - Абстракция над OpenAI API
   - Поддержка 2-3 провайдеров через OpenRouter

2. **Council Node Type** (2 дня)
   - Новый тип ноды с несколькими ответами
   - Визуализация всех ответов в одной ноде

3. **Peer Review Stage** (2 дня)
   - Анонимная оценка ответов
   - Простой ranking

4. **Chairman Synthesis** (1 день)
   - Финальный ответ от Chairman модели

5. **UI Polish** (1 день)
   - Анимации
   - Цветовая индикация

**Результат:** Рабочий прототип Council Mode за 8 рабочих дней.

---

*Tension + LLM Council = Визуальная система коллективного интеллекта*
