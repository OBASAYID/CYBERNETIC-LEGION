import numpy as np
import torch
from server.quantum_ai.core_algorithms.deep_learning import DeepLearningProcessor

# Initialize the processor
processor = DeepLearningProcessor(framework='auto')

# Assume the model was trained previously and is available
model = processor.build_neural_network([20, 64, 3])

# Simulate training to populate model
processor.train_model(
    np.random.rand(100, 20),
    np.random.randint(0, 3, 100),
    epochs=1
)

# Start interaction
print("\n=== Interactive Model Prediction ===")
print("Enter your feature values (comma-separated, 20 features):")

try:
    # Read input
    user_input = input("Features: ")
    features = np.array([float(i) for i in user_input.split(',')])

    # Check if the correct number of features is provided
    if features.shape[0] != 20:
        raise ValueError("Please enter exactly 20 feature values.")

    # Convert to tensor
    X_tensor = torch.FloatTensor(features).unsqueeze(0)

    # Predict
    model.eval()
    with torch.no_grad():
        result = model(X_tensor)

    # Output prediction
    print("\n=== Prediction ===")
    print("Predicted values:", result.detach().cpu().numpy())

except Exception as e:
    print("Error during prediction:", e)
