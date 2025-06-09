from flask_frozen import Freezer
from app import app

# Cấu hình cho GitHub Pages
app.config['FREEZER_DESTINATION'] = 'build'
app.config['FREEZER_BASE_URL'] = 'https://hoangthithanhtu100401.github.io/demo_AnD/'
app.config['FREEZER_RELATIVE_URLS'] = True

freezer = Freezer(app)

if __name__ == '__main__':
    freezer.freeze()