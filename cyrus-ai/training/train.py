import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from models.local_model import get_local_model_and_tokenizer, reload_local_model
from models.versioning import get_active_model_path, model_output_root, register_model_version, set_active_model
from safety.override import is_locked
from training.dataset_builder import count_training_examples
from training.evaluate import evaluate_candidate_model
from training.safeguards import register_promotion_safeguard


def _dataset_path() -> Path:
    default = Path(__file__).resolve().parent.parent / "runtime-data" / "training_data.jsonl"
    return Path(os.getenv("CYRUS_TRAINING_DATASET_FILE", str(default)))


def _format_example(example: Dict[str, Any]) -> Dict[str, str]:
    input_text = str(example.get("input", "")).strip()
    output_text = str(example.get("output", "")).strip()
    return {"text": f"### Input:\n{input_text}\n\n### Output:\n{output_text}"}


def train_model() -> Dict[str, Any]:
    if is_locked():
        return {
            "status": "blocked",
            "reason": "system_lockdown",
        }

    dataset_file = _dataset_path()
    if not dataset_file.exists():
        return {"status": "skipped", "reason": "dataset_missing", "dataset": str(dataset_file)}

    min_examples = int(os.getenv("CYRUS_MIN_TRAINING_EXAMPLES", "20"))
    examples = count_training_examples()
    if examples < min_examples:
        return {
            "status": "skipped",
            "reason": "insufficient_examples",
            "required": min_examples,
            "available": examples,
        }

    os.environ.setdefault("TRANSFORMERS_NO_TF", "1")
    os.environ.setdefault("USE_TF", "0")

    from datasets import load_dataset
    from torch.optim import AdamW
    from torch.utils.data import DataLoader
    from transformers import DataCollatorForLanguageModeling

    model, tokenizer, base_model = get_local_model_and_tokenizer()
    dataset = load_dataset("json", data_files=str(dataset_file))

    formatted = dataset["train"].map(_format_example, remove_columns=dataset["train"].column_names)

    def tokenize(batch: Dict[str, Any]) -> Dict[str, Any]:
        return tokenizer(batch["text"], truncation=True, max_length=1024)

    tokenized = formatted.map(tokenize, batched=True, remove_columns=["text"])
    output_dir = model_output_root() / f"model-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"

    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    batch_size = int(os.getenv("CYRUS_TRAIN_BATCH_SIZE", "1"))
    grad_accumulation = int(os.getenv("CYRUS_TRAIN_GRAD_ACCUMULATION", "4"))
    num_epochs = int(float(os.getenv("CYRUS_TRAIN_EPOCHS", "1")))
    learning_rate = float(os.getenv("CYRUS_TRAIN_LR", "2e-5"))

    tokenized.set_format(type="python")
    dataloader = DataLoader(tokenized, batch_size=batch_size, shuffle=True, collate_fn=data_collator)
    optimizer = AdamW(model.parameters(), lr=learning_rate)

    model.train()
    primary_device = next(model.parameters()).device
    total_loss = 0.0
    step_count = 0

    for _ in range(num_epochs):
        optimizer.zero_grad(set_to_none=True)
        for idx, batch in enumerate(dataloader):
            batch = {k: v.to(primary_device) for k, v in batch.items()}
            outputs = model(**batch)
            loss = outputs.loss / max(grad_accumulation, 1)
            loss.backward()

            should_step = (idx + 1) % max(grad_accumulation, 1) == 0
            if should_step:
                optimizer.step()
                optimizer.zero_grad(set_to_none=True)

            total_loss += float(loss.item())
            step_count += 1

        if len(dataloader) % max(grad_accumulation, 1) != 0:
            optimizer.step()
            optimizer.zero_grad(set_to_none=True)

    model.save_pretrained(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))

    avg_loss = total_loss / step_count if step_count else None

    registry_entry = register_model_version(
        str(output_dir),
        {
            "base_model": base_model,
            "examples": examples,
            "epochs": num_epochs,
            "loss": avg_loss,
        },
    )

    evaluation = evaluate_candidate_model(str(output_dir))
    promoted = bool(evaluation.get("promoted"))
    previous_active_model = get_active_model_path()

    if promoted:
        promotion = set_active_model(
            str(output_dir),
            metadata={
                "evaluation": evaluation,
                "base_model": base_model,
            },
        )
        safeguard = register_promotion_safeguard(str(output_dir), previous_active_model)
        loaded_model = reload_local_model(str(output_dir))
    else:
        promotion = None
        safeguard = None
        loaded_model = reload_local_model()

    return {
        "status": "trained",
        "model_path": str(output_dir),
        "loaded_model": loaded_model,
        "registry": registry_entry,
        "examples": examples,
        "evaluation": evaluation,
        "promoted": promoted,
        "promotion": promotion,
        "safeguard": safeguard,
    }
