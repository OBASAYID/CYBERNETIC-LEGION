from training.dataset_builder import count_training_examples, log_training_example
from training.evaluate import evaluate_candidate_model
from training.safeguards import evaluate_promotion_safeguard, get_promotion_safeguard_state


def train_model():
    from training.train import train_model as _train_model

    return _train_model()


__all__ = [
    "log_training_example",
    "count_training_examples",
    "evaluate_candidate_model",
    "get_promotion_safeguard_state",
    "evaluate_promotion_safeguard",
    "train_model",
]
