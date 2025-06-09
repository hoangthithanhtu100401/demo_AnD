from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

# Thay YOUR_API_KEY bằng API key của bạn từ ExchangeRate-API
API_KEY = 'bc03beccd0f2c8dd2520ba72'
BASE_URL = f'https://v6.exchangerate-api.com/v6/{API_KEY}'

# Danh sách các loại tiền tệ phổ biến
CURRENCIES = {
    'USD': 'Đô-la Mỹ',
    'EUR': 'Euro',
    'GBP': 'Bảng Anh',
    'JPY': 'Yên Nhật',
    'AUD': 'Đô-la Úc',
    'CAD': 'Đô-la Canada',
    'CHF': 'Franc Thụy Sĩ',
    'CNY': 'Nhân dân tệ',
    'HKD': 'Đô-la Hồng Kông',
    'SGD': 'Đô-la Singapore',
    'TWD': 'Đô-la Đài Loan',
    'KRW': 'Won Hàn Quốc',
    'VND': 'Đồng Việt Nam'
}

@app.route('/')
def index():
    return render_template('index.html', currencies=CURRENCIES)

@app.route('/convert', methods=['POST'])
def convert():
    try:
        data = request.get_json()
        amount = float(data['amount'])
        from_currency = data['from_currency']
        to_currency = data['to_currency']
        
        # Gọi API để lấy tỷ giá
        response = requests.get(f'{BASE_URL}/pair/{from_currency}/{to_currency}')
        
        if response.status_code == 200:
            rate_data = response.json()
            conversion_rate = rate_data['conversion_rate']
            result = amount * conversion_rate
            
            # Tạo bảng chuyển đổi nhanh
            quick_conversions = [
                {'amount': amount * 0.2, 'result': (amount * 0.2) * conversion_rate},
                {'amount': amount * 0.5, 'result': (amount * 0.5) * conversion_rate},
                {'amount': amount * 2, 'result': amount * 2 * conversion_rate},
                {'amount': amount * 5, 'result': amount * 5 * conversion_rate},
                {'amount': amount * 10, 'result': amount * 10 * conversion_rate}
            ]
            
            return jsonify({
                'result': round(result, 2),
                'rate': conversion_rate,
                'quick_conversions': quick_conversions
            })
        else:
            return jsonify({
                'error': 'Không thể lấy tỷ giá. Vui lòng thử lại sau.'
            }), 400
            
    except Exception as e:
        return jsonify({
            'error': 'Có lỗi xảy ra khi chuyển đổi tiền tệ.'
        }), 500

@app.route('/get_all_rates', methods=['POST'])
def get_all_rates():
    try:
        data = request.get_json()
        base_currency = data['currency']
        
        # Lấy tỷ giá của tất cả các loại tiền tệ so với base_currency
        response = requests.get(f'{BASE_URL}/latest/{base_currency}')
        
        if response.status_code == 200:
            rates_data = response.json()
            conversion_rates = rates_data['conversion_rates']
            
            # Lọc chỉ lấy các loại tiền tệ trong danh sách CURRENCIES
            filtered_rates = {code: rate for code, rate in conversion_rates.items() if code in CURRENCIES}
            
            return jsonify(filtered_rates)
        else:
            return jsonify({
                'error': 'Không thể lấy tỷ giá. Vui lòng thử lại sau.'
            }), 400
            
    except Exception as e:
        return jsonify({
            'error': 'Có lỗi xảy ra khi lấy tỷ giá.'
        }), 500

if __name__ == '__main__':
    app.run(debug=True)