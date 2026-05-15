from flask import Flask, Response
import cv2
from mediapipe.python.solutions import hands as mp_hands
from mediapipe.python.solutions import drawing_utils as drawing
import math
import json

app = Flask(__name__)

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.3,
    min_tracking_confidence=0.3
)
drawing = mp.solutions.drawing_utils

camera = cv2.VideoCapture(0)

prev_points = {}

def detect_swipe(current, previous):
    if previous is None:
        return False

    distance = math.hypot(current[0] - previous[0], current[1] - previous[1])

    # HIGH SENSITIVITY
    return distance > 12

@app.route('/gesture')
def gesture():
    def generate():
        global prev_points

        while True:
            success, frame = camera.read()

            if not success:
                continue

            frame = cv2.flip(frame, 1)

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            results = hands.process(rgb)

            gesture_data = {
                "swipes": []
            }

            if results.multi_hand_landmarks:

                for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):

                    index_tip = hand_landmarks.landmark[8]

                    h, w, _ = frame.shape

                    x = int(index_tip.x * w)
                    y = int(index_tip.y * h)

                    prev = prev_points.get(idx)

                    swipe = detect_swipe((x, y), prev)

                    prev_points[idx] = (x, y)

                    gesture_data["swipes"].append({
                        "x": x,
                        "y": y,
                        "cutting": swipe
                    })

                    drawing.draw_landmarks(
                        frame,
                        hand_landmarks,
                        mp_hands.HAND_CONNECTIONS
                    )

            _, buffer = cv2.imencode('.jpg', frame)

            frame_bytes = buffer.tobytes()

            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' +
                frame_bytes +
                b'\r\n'
            )

    return Response(
        generate(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

if __name__ == "__main__":
    app.run(debug=True)