// 25 rubric-graded questions on neural networks and LLMs.
// Each question has: reference points (shown to Jev as the answer key),
// rubric criteria (each becomes a noul question), and misconceptions (nouls that should be false).

export default {
  id: "nn-llm",
  title: "Neural networks and LLMs",
  description: "For developers learning how models are trained and used.",
  questions: [
  // ---------- Neural network basics ----------
  {
    id: "nn-neuron",
    topic: "Neural network basics",
    prompt: "What does a single artificial neuron compute?",
    points: [
      "A weighted sum of its inputs plus a bias term",
      "The result is passed through a non-linear activation function",
      "The weights and bias are the learnable parameters",
    ],
    rubric: [
      "states that the neuron computes a weighted sum of inputs",
      "mentions a bias term",
      "says the sum is passed through a non-linear activation function",
      "identifies weights and bias as the learnable parameters",
    ],
    misconceptions: [
      "claims a neuron stores or memorises training examples directly",
    ],
  },
  {
    id: "nn-activation",
    topic: "Neural network basics",
    prompt: "Why do neural networks need non-linear activation functions?",
    points: [
      "Without non-linearity, stacking layers collapses into a single linear transformation",
      "Non-linearity lets the network approximate complex, non-linear functions",
      "Examples include ReLU, sigmoid, tanh, GELU",
    ],
    rubric: [
      "explains that stacked linear layers without activations are equivalent to one linear layer",
      "says non-linearity is what allows the network to model non-linear or complex functions",
      "names at least one activation function such as ReLU, sigmoid, tanh or GELU",
    ],
    misconceptions: [
      "claims activation functions exist mainly to keep values between 0 and 1",
    ],
  },
  {
    id: "nn-loss",
    topic: "Neural network basics",
    prompt: "What is a loss function and what role does it play in training?",
    points: [
      "It measures how far the model's predictions are from the targets",
      "Training minimises the loss by adjusting parameters",
      "Different tasks use different losses, e.g. cross-entropy for classification, MSE for regression",
    ],
    rubric: [
      "says the loss measures the gap between predictions and the true targets",
      "says training works by minimising the loss",
      "gives an example of a loss such as cross-entropy or mean squared error",
    ],
    misconceptions: [
      "confuses the loss function with the activation function",
    ],
  },
  {
    id: "nn-gradient-descent",
    topic: "Neural network basics",
    prompt: "Explain gradient descent in your own words.",
    points: [
      "Compute the gradient of the loss with respect to each parameter",
      "Update parameters a small step in the direction that reduces the loss (opposite the gradient)",
      "The step size is controlled by the learning rate",
      "Repeat over many iterations",
    ],
    rubric: [
      "says the gradient of the loss with respect to the parameters is computed",
      "says parameters move in the direction opposite to the gradient to reduce loss",
      "mentions the learning rate as the step size",
      "conveys that this is repeated iteratively",
    ],
    misconceptions: [
      "claims parameters are moved in the same direction as the gradient",
    ],
  },
  {
    id: "nn-backprop",
    topic: "Neural network basics",
    prompt: "What is backpropagation and why is it efficient?",
    points: [
      "An algorithm to compute gradients of the loss for every parameter",
      "Applies the chain rule layer by layer from the output back to the input",
      "Reuses intermediate results so all gradients cost about one extra forward pass",
    ],
    rubric: [
      "says backpropagation computes gradients of the loss for the parameters",
      "mentions the chain rule",
      "says gradients flow backwards from the output layer toward earlier layers",
      "explains efficiency through reuse of intermediate computations",
    ],
    misconceptions: [
      "claims backpropagation is the same thing as gradient descent or the optimiser",
    ],
  },
  {
    id: "nn-overfitting",
    topic: "Neural network basics",
    prompt: "What is overfitting and name two ways to reduce it.",
    points: [
      "The model fits training data too closely, including noise, and generalises poorly",
      "Training loss keeps falling while validation loss rises",
      "Remedies: more data, regularisation, dropout, early stopping, data augmentation, smaller model",
    ],
    rubric: [
      "defines overfitting as fitting training data too closely with poor generalisation to new data",
      "mentions the gap between training and validation performance",
      "names at least two remedies such as more data, dropout, regularisation, early stopping or augmentation",
    ],
    misconceptions: [
      "claims overfitting means the model is too small or underpowered",
    ],
  },

  // ---------- Training ----------
  {
    id: "tr-learning-rate",
    topic: "Training",
    prompt: "What happens if the learning rate is too high, and if it is too low?",
    points: [
      "Too high: loss oscillates or diverges, overshoots minima",
      "Too low: training is very slow and can get stuck",
      "Schedules and warmup are used to manage it",
    ],
    rubric: [
      "says a too-high learning rate causes divergence, oscillation or overshooting",
      "says a too-low learning rate makes training slow or stuck",
      "mentions learning rate schedules, warmup or decay",
    ],
    misconceptions: [],
  },
  {
    id: "tr-batch",
    topic: "Training",
    prompt: "What is a mini-batch and why do we train with mini-batches instead of the whole dataset?",
    points: [
      "A subset of examples used for one gradient update",
      "Full-batch is too expensive in memory and compute",
      "Mini-batch gradients are noisy estimates, which also helps generalisation",
      "Fits GPU parallelism",
    ],
    rubric: [
      "defines a mini-batch as a subset of training examples used per update",
      "gives memory or compute cost as a reason against full-batch training",
      "mentions that the gradient noise from mini-batches can help generalisation or escape poor minima",
    ],
    misconceptions: [
      "claims larger batches always produce better models",
    ],
  },
  {
    id: "tr-adam",
    topic: "Training",
    prompt: "How does Adam differ from plain stochastic gradient descent?",
    points: [
      "Keeps running averages of the gradient (momentum) and of the squared gradient",
      "Adapts the step size per parameter",
      "Usually converges faster with less tuning",
    ],
    rubric: [
      "mentions momentum or a running average of gradients",
      "mentions a running average of squared gradients or per-parameter adaptive step sizes",
      "says Adam typically needs less tuning or converges faster than SGD",
    ],
    misconceptions: [
      "claims Adam changes the model architecture or the loss function",
    ],
  },
  {
    id: "tr-vanishing",
    topic: "Training",
    prompt: "What is the vanishing gradient problem and what helps with it?",
    points: [
      "Gradients shrink as they pass back through many layers, so early layers barely learn",
      "Caused by saturating activations like sigmoid and repeated multiplication of small values",
      "Helped by ReLU, residual connections, normalisation, careful initialisation",
    ],
    rubric: [
      "explains that gradients become very small in early layers of deep networks",
      "gives a cause such as saturating activations or repeated multiplication through layers",
      "names at least one fix such as ReLU, residual or skip connections, normalisation or initialisation",
    ],
    misconceptions: [
      "claims vanishing gradients are caused by a learning rate that is too high",
    ],
  },
  {
    id: "tr-split",
    topic: "Training",
    prompt: "Why do we split data into train, validation, and test sets?",
    points: [
      "Train is used to fit parameters",
      "Validation is used for model selection and hyperparameter tuning",
      "Test gives an unbiased final estimate and must not influence any decisions",
    ],
    rubric: [
      "says the training set is used to fit the model parameters",
      "says the validation set is used for tuning hyperparameters or selecting models",
      "says the test set is held out for a final unbiased estimate and must not be used for tuning",
    ],
    misconceptions: [
      "suggests the test set can be used to tune hyperparameters",
    ],
  },

  // ---------- Transformers and LLMs ----------
  {
    id: "tf-tokens",
    topic: "Transformers and LLMs",
    prompt: "What is a token in an LLM, and how does it relate to words?",
    points: [
      "A token is a chunk of text from a fixed vocabulary, often a subword",
      "Words can be one or several tokens; rare words split into more tokens",
      "Tokenisers like BPE or SentencePiece build the vocabulary",
      "Context limits and pricing are counted in tokens",
    ],
    rubric: [
      "says a token is a unit of text from a fixed vocabulary, often a subword rather than a whole word",
      "says a single word can map to one or more tokens",
      "mentions a tokeniser or algorithm such as BPE, WordPiece or SentencePiece",
    ],
    misconceptions: [
      "claims that one token always equals exactly one word",
    ],
  },
  {
    id: "tf-embeddings",
    topic: "Transformers and LLMs",
    prompt: "What is an embedding?",
    points: [
      "A dense vector representation of a token, word, or piece of content",
      "Learned so that similar meanings are close in vector space",
      "Used as the input to the transformer and for semantic search",
    ],
    rubric: [
      "says an embedding is a dense numeric vector representing a token or piece of content",
      "says semantically similar items end up close together in the vector space",
      "says embeddings are learned rather than hand-designed",
    ],
    misconceptions: [
      "claims embeddings are just one-hot encodings",
    ],
  },
  {
    id: "tf-attention",
    topic: "Transformers and LLMs",
    prompt: "Explain self-attention using queries, keys, and values.",
    points: [
      "Each token produces a query, key, and value vector via learned projections",
      "Attention weights come from the dot product of a query with all keys, scaled and softmaxed",
      "The output is the weighted sum of the values",
      "This lets each token gather information from every other token",
    ],
    rubric: [
      "says each token is projected into query, key and value vectors",
      "says attention weights are computed from query and key similarity, typically a dot product followed by softmax",
      "says the output is a weighted sum of value vectors",
      "conveys that every token can attend to every other token in the sequence",
    ],
    misconceptions: [
      "claims attention processes tokens strictly one at a time like an RNN",
    ],
  },
  {
    id: "tf-multihead",
    topic: "Transformers and LLMs",
    prompt: "Why do transformers use multiple attention heads?",
    points: [
      "Each head learns to attend to different relationships or patterns",
      "Heads operate in parallel on lower-dimensional projections",
      "Outputs are concatenated and projected back",
    ],
    rubric: [
      "says different heads can capture different relationships or patterns",
      "says heads run in parallel on separate projections",
      "mentions that head outputs are concatenated or combined afterwards",
    ],
    misconceptions: [],
  },
  {
    id: "tf-positional",
    topic: "Transformers and LLMs",
    prompt: "Why do transformers need positional encodings?",
    points: [
      "Self-attention is permutation-invariant, it has no built-in sense of order",
      "Positional information is added to token embeddings",
      "Variants include sinusoidal, learned, and rotary (RoPE) encodings",
    ],
    rubric: [
      "says self-attention by itself does not know the order of tokens",
      "says positional information is added or combined with the token embeddings",
      "names a positional encoding scheme such as sinusoidal, learned or rotary",
    ],
    misconceptions: [
      "claims transformers process tokens sequentially and therefore know positions automatically",
    ],
  },
  {
    id: "tf-autoregressive",
    topic: "Transformers and LLMs",
    prompt: "What does it mean that an LLM is autoregressive?",
    points: [
      "It generates one token at a time",
      "Each new token is conditioned on all previous tokens",
      "The generated token is appended and the process repeats",
    ],
    rubric: [
      "says the model generates one token at a time",
      "says each token is predicted conditioned on the previous tokens",
      "says the generated token is fed back as input for the next step",
    ],
    misconceptions: [
      "claims the model produces the whole response in a single step",
    ],
  },
  {
    id: "tf-pretrain-finetune",
    topic: "Transformers and LLMs",
    prompt: "What is the difference between pre-training and fine-tuning?",
    points: [
      "Pre-training: self-supervised next-token prediction on huge general corpora",
      "Fine-tuning: further training on a smaller task or instruction dataset",
      "Fine-tuning adapts behaviour; pre-training builds general knowledge",
    ],
    rubric: [
      "says pre-training uses large general text with a self-supervised objective such as next-token prediction",
      "says fine-tuning continues training on a smaller task-specific or instruction dataset",
      "contrasts their purpose: general capability versus adapted behaviour",
    ],
    misconceptions: [
      "claims fine-tuning is how the model gains most of its world knowledge",
    ],
  },
  {
    id: "tf-rlhf",
    topic: "Transformers and LLMs",
    prompt: "What is RLHF and why is it used?",
    points: [
      "Reinforcement learning from human feedback",
      "Humans rank or compare model outputs; a reward model is trained on those preferences",
      "The LLM is then optimised against the reward model",
      "Aligns the model with helpfulness and safety preferences beyond what next-token prediction gives",
    ],
    rubric: [
      "expands RLHF as reinforcement learning from human feedback",
      "mentions collecting human preferences or rankings over model outputs",
      "mentions a reward model trained on those preferences",
      "says the goal is to align the model with human preferences such as helpfulness or safety",
    ],
    misconceptions: [
      "claims RLHF is how the model learns facts or knowledge",
    ],
  },
  {
    id: "tf-context",
    topic: "Transformers and LLMs",
    prompt: "What is the context window and why is it limited?",
    points: [
      "The maximum number of tokens the model can attend to at once",
      "Attention cost grows with sequence length (quadratic in standard attention)",
      "Positional encodings are trained up to a certain length",
      "Longer contexts need more memory for the KV cache",
    ],
    rubric: [
      "defines the context window as the maximum tokens the model can process or attend to at once",
      "gives a cost reason such as attention scaling with sequence length or memory for the KV cache",
      "mentions that positional encodings or training length limit how far the model generalises",
    ],
    misconceptions: [
      "claims the model permanently remembers everything from previous conversations",
    ],
  },

  // ---------- Using LLMs in practice ----------
  {
    id: "use-temperature",
    topic: "Using LLMs in practice",
    prompt: "What does the temperature parameter do during sampling?",
    points: [
      "Scales the logits before the softmax",
      "Higher temperature flattens the distribution and makes outputs more random",
      "Lower temperature sharpens it and makes outputs more deterministic",
      "It does not change the model weights",
    ],
    rubric: [
      "says temperature scales or divides the logits before the softmax",
      "says higher temperature makes sampling more random and lower makes it more deterministic",
      "explicitly says temperature does not change the model or its weights",
    ],
    misconceptions: [
      "claims temperature changes or retrains the model weights",
    ],
  },
  {
    id: "use-hallucination",
    topic: "Using LLMs in practice",
    prompt: "What is a hallucination in an LLM and why does it happen?",
    points: [
      "Fluent output that is factually wrong or unsupported",
      "The model is trained to predict plausible text, not to verify truth",
      "Gaps in training data or ambiguous prompts increase it",
      "Mitigations: grounding with retrieval, citations, verification, lower temperature",
    ],
    rubric: [
      "defines hallucination as confident or fluent output that is factually incorrect or unsupported",
      "attributes it to the model optimising for plausible next tokens rather than truth",
      "names at least one mitigation such as retrieval grounding, citations, verification or lower temperature",
    ],
    misconceptions: [
      "claims hallucinations are caused by the model deliberately lying",
    ],
  },
  {
    id: "use-rag",
    topic: "Using LLMs in practice",
    prompt: "Explain how retrieval-augmented generation (RAG) works.",
    points: [
      "Documents are chunked and embedded into a vector store",
      "At query time the question is embedded and similar chunks are retrieved",
      "Retrieved chunks are put into the prompt as context",
      "The LLM answers grounded in that context, reducing hallucination and enabling fresh data",
    ],
    rubric: [
      "says documents are chunked and embedded into a vector index or store",
      "says the user query is embedded and the most similar chunks are retrieved",
      "says the retrieved chunks are inserted into the prompt as context for the LLM",
      "gives a benefit such as grounding, reduced hallucination or access to up-to-date or private data",
    ],
    misconceptions: [
      "claims RAG fine-tunes or updates the model weights with the documents",
    ],
  },
  {
    id: "use-prompt-caching",
    topic: "Using LLMs in practice",
    prompt: "What is prompt caching and when does it save money?",
    points: [
      "The provider stores the processed prefix (KV cache) of a prompt",
      "Repeated requests sharing that exact prefix skip recomputation",
      "Saves cost and latency when a long system prompt or document is reused across many calls",
      "Only the unchanged prefix is cached; changes early in the prompt break the cache",
    ],
    rubric: [
      "says the provider stores the computed state of a prompt prefix so it need not be recomputed",
      "says savings apply when many requests share the same long prefix such as a system prompt or document",
      "mentions that the cache only applies to an unchanged prefix or that early edits invalidate it",
    ],
    misconceptions: [
      "claims prompt caching stores the model's final answers and returns them for similar questions",
    ],
  },
  {
    id: "use-evals",
    topic: "Using LLMs in practice",
    prompt: "Why do LLM applications need evals, and what makes a good eval?",
    points: [
      "Model outputs vary, so you need a repeatable way to measure quality and catch regressions",
      "A good eval has representative inputs, clear pass criteria, and covers edge cases",
      "Can combine exact checks, rubric grading, and human review",
      "Run on every prompt or model change",
    ],
    rubric: [
      "says evals measure output quality repeatably and catch regressions when prompts or models change",
      "says a good eval uses representative or real inputs with clear pass criteria",
      "mentions edge cases, adversarial inputs or failure modes as part of coverage",
      "mentions at least one grading method such as exact match, rubric or LLM-as-judge, or human review",
    ],
    misconceptions: [
      "claims a single manual test of a few prompts is sufficient evaluation for production",
    ],
  },
],
};
