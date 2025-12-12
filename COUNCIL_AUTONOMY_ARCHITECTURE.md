# Council Autonomy & Multi-Model Orchestration

## Goal
Полностью автономный консул, который:
- Видит текущий граф/JSON состояния (ноды, связи, модели, результаты).
- Сам планирует количество веток, выбор моделей и последовательность волн.
- Исполняет волны последовательно, слияния результатов и возможные новые волны до max глубины.
- Отвечает на вопросы пользователя в процессе и отображает живой план/статус в правом меню.
- Отображает соединения в цветах провайдеров (OpenAI — зелёный, Google — синий, Anthropic — оранжевый, XAI — фиолетовый, Ollama — серый).

## UX/Правое меню (Council Panel)
- Структура: «План волнами» (Wave 1, Wave 2, ...), каждая волна = набор веток (модель, цель, статус).
- Для каждой ветки: модель, провайдер (цвет бейджа), связанная нода в графе, статус (queued/playing/done/error), время.
- Визуализация слияний: «Merge → target node» с перечислением источников.
- Контроль глубины: переключатель/слайдер maxDepth (1..N). Отображение текущей глубины.
- Интерактив: клик по ветке или мерджу → подсветка/центрирование ноды на канвасе.
- Вопросы к консула: при вводе вопроса консулу он отвечает, опираясь на текущий план/статусы; отображать связанный узел/ветку, если есть.
- Live log: компактный список событий ("Wave2/Branch3 started", "Merge completed"), сворачиваемый.

## Архитектура/Потоки данных
- Источник правды: граф (nodes + connections) + metadata (модель, providerId, status, waveIndex, mergeTarget?).
- Планировщик консула:
  1) Инициализация: корневая нода (RU prompt) → Wave1 план: выбрать k моделей, создать дочерние ноды, запустить.
  2) После завершения Wave1: консул анализирует результаты (LLM call) → решает, нужны ли новые ветки/модели → формирует Wave2, пока depth < maxDepth.
  3) Мердж: после волны возможен merge-нода (анализатор), собирающая ответы волны; может стать входом для следующей волны.
  4) Остановка: достигнута maxDepth или консул решил, что достаточно.
- Хранение плана: структура `CouncilPlan` в состоянии workspace (waves[], branches[], merges[]). Каждая branch привязана к nodeId и providerId.
- Исполнение: последовательные волны. Внутри волны можно параллелить ветки одного уровня. Между волнами — анализ и планирование следующей.
- Обновление статусов: на старте ветки ставить `isPlaying=true`, по результату — ответ/ошибка, статус `done/error`.
- Навигация: ChatPanel и CouncilPanel вызывают `centerOnNode(nodeId)` и подсветку ноды.

## Модели/цвета/соединения
- Провайдер → цвет линий/бейджей:
  - openai: #34c759 (зелёный)
  - google: #0b7bff (синий)
  - anthropic: #ff9f0a (оранжевый)
  - xai: #9b59b6 (фиолетовый)
  - ollama: #8e8e93 (серый)
- Соединения: хранить `connectionColor` по providerId для визуального различия; при создании веток/мерджей устанавливать цвет.
- Тип данных по-прежнему text, но визуальное различие по цвету линий и бейджей.

## API/Модель выполнения (черновик интерфейсов)
- `CouncilPlan`:
  ```ts
  type BranchStatus = 'queued' | 'running' | 'done' | 'error';
  interface CouncilBranch {
    id: string;
    wave: number;
    modelId: string;
    providerId: ProviderId;
    sourceNodeId: string; // откуда пошла ветка
    nodeId: string;       // созданная нода
    status: BranchStatus;
    error?: string;
    startedAt?: number;
    finishedAt?: number;
  }
  interface CouncilMerge {
    id: string;
    wave: number;
    inputNodeIds: string[];
    outputNodeId: string;
    providerId: ProviderId; // модель для анализа/слияния
    status: BranchStatus;
  }
  interface CouncilPlan {
    maxDepth: number;
    waves: number; // сколько уже исполнено волн
    branches: CouncilBranch[];
    merges: CouncilMerge[];
  }
  ```
- Планировщик:
  ```ts
  async function runCouncil(rootNodeId, maxDepth) {
    let depth = 0;
    let currentEntry = rootNodeId;
    while (depth < maxDepth) {
      const wavePlan = await llmPlanWave(currentEntry, depth);
      const branchNodeIds = await executeWaveBranches(wavePlan.branches);
      const mergeNodeId = await executeMerge(wavePlan.merge);
      updatePlanState(depth, wavePlan, branchNodeIds, mergeNodeId);
      const needMore = await llmDecideNext(mergeNodeId, depth, maxDepth);
      if (!needMore) break;
      currentEntry = mergeNodeId;
      depth++;
    }
  }
  ```
- Компоненты UI подписываются на план/статусы (hook/selectors) и рисуют живые бейджи, волны, лог.

## Интеграция с текущим кодом
- Расширить `WorkspaceModel` действиями: `playCouncilAutonomous({ rootNodeId, maxDepth })` возвращает план/статус обновления через колбек или состояние.
- Расширить `council/engine` или обернуть планировщиком, который вызывает LLM для: выбора моделей/кол-ва веток, генерации промптов для веток, выбора модели для merge-анализа, решения о продолжении.
- Добавить хранение `providerId` в connections + цвет.
- Canvas: добавить опцию цветовых линий по providerId, легенду цветов.
- ChatPanel/CouncilPanel: таб «План» с волнами, статусами, кликом к ноде.
- Настройки: maxDepth селектор; возможно «авто-подбор веток» toggle.

## MVP-шаги для реализации
1) Данные: в состояние графа добавить `connectionColor` и `providerId` для новых связей; маппинг цветов.
2) UI: легенда цветов + подсветка линий по providerId.
3) План: хранение `CouncilPlan` в состоянии, API для обновления статусов.
4) Исполнение волн: функция `runCouncilPlan(rootNodeId, maxDepth)` с циклами волн и merge.
5) CouncilPanel: визуализация волн/веток/мерджей + навигация к нодам; live log.
6) Chat интеграция: ответы консула опираются на текущее состояние плана; можно задавать вопросы — отвечает с учётом статусов.
7) Цветные связи при создании веток/мерджей, и отображение на канвасе.

## Открытые вопросы
- Нужен ли ручной выбор моделей перед каждой волной или полностью автоподбор (по умолчанию авто, с возможностью ручного override)?
- Нужен ли лимит на количество веток на волну?
- Нужен ли выбор модели для merge (анализатора) отдельно от веток?
