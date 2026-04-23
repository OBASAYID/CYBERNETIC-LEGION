import os
from threading import Lock
from typing import Optional, Tuple

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from models.versioning import get_active_model_path

_DEFAULT_MODEL_NAME = os.getenv("CYRUS_LOCAL_MODEL_NAME", "mistralai/Mistral-7B-Instruct-v0.2")
_MAX_NEW_TOKENS = int(os.getenv("CYRUS_LOCAL_MAX_NEW_TOKENS", "200"))
_MAX_INPUT_TOKENS = int(os.getenv("CYRUS_LOCAL_MAX_INPUT_TOKENS", "2048"))
_ALLOW_REMOTE_DOWNLOAD = os.getenv("CYRUS_LOCAL_ALLOW_REMOTE_DOWNLOAD", "0").lower() in {"1", "true", "yes"}

_model: Optional[AutoModelForCausalLM] = None
_tokenizer: Optional[AutoTokenizer] = None
_loaded_model_name: Optional[str] = None
_model_lock = Lock()


def _resolve_model_name(explicit_model: Optional[str] = None) -> str:
    if explicit_model:
        return explicit_model

    prefer_finetuned = os.getenv("CYRUS_USE_FINETUNED_MODEL", "1").lower() in {"1", "true", "yes"}
    if prefer_finetuned:
        active = get_active_model_path()
        if active:
            return active

    return _DEFAULT_MODEL_NAME


def _resolve_torch_dtype() -> torch.dtype:
    if torch.cuda.is_available() or torch.backends.mps.is_available():
        return torch.float16
    return torch.float32


def get_local_model_and_tokenizer(
    explicit_model: Optional[str] = None,
) -> Tuple[AutoModelForCausalLM, AutoTokenizer, str]:
    global _model, _tokenizer, _loaded_model_name

    selected_model_name = _resolve_model_name(explicit_model)
    with _model_lock:
        if _model is not None and _tokenizer is not None and _loaded_model_name == selected_model_name:
            return _model, _tokenizer, selected_model_name

        tokenizer = AutoTokenizer.from_pretrained(
            selected_model_name,
            local_files_only=not _ALLOW_REMOTE_DOWNLOAD,
        )
        if tokenizer.pad_token is None and tokenizer.eos_token is not None:
            tokenizer.pad_token = tokenizer.eos_token

        model = AutoModelForCausalLM.from_pretrained(
            selected_model_name,
            torch_dtype=_resolve_torch_dtype(),
            device_map="auto",
            local_files_only=not _ALLOW_REMOTE_DOWNLOAD,
        )
        model.eval()

        _model = model
        _tokenizer = tokenizer
        _loaded_model_name = selected_model_name

        return _model, _tokenizer, selected_model_name


def reload_local_model(explicit_model: Optional[str] = None) -> str:
    global _model, _tokenizer, _loaded_model_name

    with _model_lock:
        _model = None
        _tokenizer = None
        _loaded_model_name = None

    _, _, selected = get_local_model_and_tokenizer(explicit_model)
    return selected


def local_infer(prompt: str, max_new_tokens: Optional[int] = None) -> str:
    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("prompt must be a non-empty string")

    model, tokenizer, _ = get_local_model_and_tokenizer()
    new_tokens = max_new_tokens or _MAX_NEW_TOKENS

    encoded = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=_MAX_INPUT_TOKENS,
        padding=True,
    )

    primary_device = next(model.parameters()).device
    encoded = {key: value.to(primary_device) for key, value in encoded.items()}
    input_len = encoded["input_ids"].shape[-1]

    with torch.inference_mode():
        output = model.generate(
            **encoded,
            max_new_tokens=new_tokens,
            do_sample=False,
            pad_token_id=tokenizer.pad_token_id,
        )

    generated_tokens = output[0][input_len:]
    text = tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()
    if text:
        return text

    return tokenizer.decode(output[0], skip_special_tokens=True).strip()
