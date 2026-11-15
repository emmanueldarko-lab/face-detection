import os
import json
import requests
from pathlib import Path

# ==========================================
# FACEREC - ULTRALYTICS AI CONNECTION
# ==========================================

# Deployment endpoint
URL = (
    "https://predict-6afa06239b676272a74fb8e5-"
    "dproatj77a-og.a.run.app/predict"
)

# Read API key securely from environment variable
API_KEY = os.getenv("ULTRALYTICS_API_KEY")

# Image to analyse
IMAGE_PATH = Path("test.jpg")

# Inference parameters
ARGS = {
    "conf": 0.25,
    "iou": 0.5,
    "imgsz": 640
}


def recognize_faces():
    response = None

    if not API_KEY:
        print("ERROR: API key not configured.")
        print("Set the ULTRALYTICS_API_KEY environment variable.")
        return

    if not IMAGE_PATH.exists():
        print(f"ERROR: Image not found: {IMAGE_PATH}")
        return

    headers = {
        "Authorization": f"Bearer {API_KEY}"
    }

    print("Connecting to FaceRec AI...")
    print("Uploading image for analysis...")

    try:
        with IMAGE_PATH.open("rb") as image:

            response = requests.post(
                URL,
                headers=headers,
                data=ARGS,
                files={
                    "file": (
                        IMAGE_PATH.name,
                        image,
                        "image/jpeg"
                    )
                },
                timeout=180
            )

        response.raise_for_status()

        result = response.json()

        print("\n========== AI RESPONSE ==========")
        print(json.dumps(result, indent=4))

        # Extract detections
        print("\n========== DETECTION RESULTS ==========")

        images = result.get("images", [])

        if not images:
            print("No image results were returned.")
            return

        for image_number, image_data in enumerate(images, start=1):

            detections = image_data.get("results", [])

            print(f"\nImage {image_number}")

            if not detections:
                print("No faces or objects detected.")
                continue

            for index, detection in enumerate(detections, start=1):

                name = detection.get("name", "Unknown")
                confidence = detection.get("confidence", 0)

                print(f"Detection {index}")
                print(f"Name/Class: {name}")
                print(f"Confidence: {confidence:.2%}")

        print("\nFaceRec AI analysis completed.")

    except requests.exceptions.Timeout:
        print("ERROR: The AI server took too long to respond.")

    except requests.exceptions.HTTPError as error:
        print(f"HTTP ERROR: {error}")
        print("Server response:", getattr(error.response, "text", ""))

    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to the AI deployment.")

    except requests.exceptions.RequestException as error:
        print(f"REQUEST ERROR: {error}")

    except ValueError:
        print("ERROR: The server did not return valid JSON.")
        print(response.text if response is not None else "")


if __name__ == "__main__":
    recognize_faces()