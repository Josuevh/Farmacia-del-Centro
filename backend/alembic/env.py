from logging.config import fileConfig
import os
from sqlalchemy import pool
from sqlalchemy.engine import create_engine
from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
fileConfig(config.config_file_name)

# We will run raw SQL from sql/schema_postgres.sql for initial schema
def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, literal_binds=True)
    with open(os.path.join(os.getcwd(), 'sql', 'schema_postgres.sql')) as f:
        sql = f.read()
    with context.begin_transaction():
        context.execute(sql)


def run_migrations_online():
    connectable = create_engine(config.get_main_option("sqlalchemy.url"))
    with connectable.connect() as connection:
        context.configure(connection=connection)
        with context.begin_transaction():
            with open(os.path.join(os.getcwd(), 'sql', 'schema_postgres.sql')) as f:
                sql = f.read()
            connection.execute(sql)

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
