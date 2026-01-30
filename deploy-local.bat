@echo off
echo Setting up for local development...

cd frontend
copy .env.example .env
echo ✓ Environment configured for local development

cd ..
echo ✓ Ready for local development!
echo Run: setup.bat to start development servers