"""Transitional Flask app - kept so the tool keeps working during Phase 0.

Phase 1 replaces this with an Astro frontend against a FastAPI backend.
Nothing new should be built here. What matters is that every route already
speaks the shared contract: it validates, calls `spec.solve`, and resolves
notices in the viewer's locale. Porting it is then a frontend job only.

Run with: python -m forneus_core.web
"""
from flask import Flask, jsonify, render_template, request

from . import i18n
from .contract import ToolError
from .exports import format_csv, format_json, report_document
from .registry import get as get_tool
from .tools import amigatos as amigatos_tool
from .tools.amigatos.data import (DATA_TIER, DISPLAY_NAMES, DISPLAY_ORDER,
                                  TABLES)
from .tools.amigatos.profiles import optimize_profile


def _locale():
    return i18n.negotiate(request.headers.get('Accept-Language'))


def create_app():
    app = Flask(__name__)

    @app.errorhandler(ToolError)
    def translated_tool_error(error):
        return jsonify(error=i18n.translate_notice(error.notice, _locale()),
                       error_key=error.notice.key,
                       params=error.notice.params), 400

    @app.get('/')
    def index():
        return render_template('index.html', order=DISPLAY_ORDER,
                               names=DISPLAY_NAMES, tiers=DATA_TIER,
                               catalog={key: [row[0] for row in TABLES[key]]
                                        for key in DISPLAY_ORDER})

    @app.post('/api/profile-optimize')
    def calculate_profile():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            raise ToolError('error.profile.missing')
        return jsonify(optimize_profile(payload.get('profile'),
                                        payload.get('new_jelly')))

    @app.post('/api/optimize')
    def calculate():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            raise ToolError('error.payload.invalid')
        locale = _locale()
        result = get_tool('amigatos').solve(payload.get('counts'),
                                            payload.get('total_jelly'))
        data = report_document(result, locale)
        data['exports'] = {'csv': format_csv(result, locale),
                           'json': format_json(result, locale)}
        return jsonify(data)

    @app.get('/api/tools')
    def tools():
        locale = _locale()
        from .registry import all_specs
        return jsonify(tools=[{
            **spec.as_dict(),
            'title': i18n.translate(spec.title_key, locale=locale),
            'description': i18n.translate(spec.description_key, locale=locale),
        } for spec in all_specs()], locale=locale)

    return app


def main():
    create_app().run(host='127.0.0.1', port=5000, debug=False)


if __name__ == '__main__':
    main()
