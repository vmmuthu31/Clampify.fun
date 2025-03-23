from django.http import StreamingHttpResponse
from django.template.loader import render_to_string
import serial
from django.shortcuts import render

CFG_comport = 'COM5'
CFG_baudrate = 115200
CFG_serial_timeout = 1
CFG_no_arduino = False

def read_sensor_data():
    ser = None  # Initialize ser outside of the conditional block
    try:
        if not CFG_no_arduino:
            print('Reading from serial port %s...' % CFG_comport)
            print("Opening serial port...")
            ser = serial.Serial(CFG_comport, CFG_baudrate, timeout=CFG_serial_timeout)
            print("Serial port opened successfully.")
        while True:
            if CFG_no_arduino:
                print("Reading from sensor (simulated data)...")
                data = "S123\nB456\nQ789\n"
                print("Received data:", data.strip())
                yield data.strip()  # Yield the data instead of returning it
            else:
                if ser and ser.is_open:  # Check if ser is not None and is open
                    data = ser.readline().decode('ascii').strip()
                    print("Received data:", data)
                    yield data.strip()  # Yield the data instead of returning it
    except Exception as e:
        print("An error occurred:", str(e))
    finally:
        if ser and ser.is_open:  # Close the serial port if it's open
            ser.close()



def sensor_data_stream():
    for sensor_data in read_sensor_data():
        if sensor_data:
            yield f"{sensor_data}\n</br>"

def get_rate(request):
    response = StreamingHttpResponse(sensor_data_stream(), content_type='text/html')
    return response

def show_data(request):
    return render(request, 'doctor/your_template.html')