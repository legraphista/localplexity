import React from 'react';
import * as Switch from '@radix-ui/react-switch';
import css from './ModelSwitch.module.scss'

import FeatherIcon from '@assets/icons/feather.svg';
import LightBulbIcon from '@assets/icons/light-bulb-idea.svg';
import classNames from "classnames";

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
}
export const ModelSwitch = ({className, onChange, value, label, disabled}: Props) => (
  <form>
    <div className={classNames(css.root, className)}>

      {label && (
        <label className={css.Label} htmlFor="llm-mode">
          {label}
        </label>
      )}

      <Switch.Root
        className={css.SwitchRoot}
        id="llm-mode"
        onCheckedChange={onChange}
        checked={value}
        disabled={disabled}
      >
        <img
          src={FeatherIcon}
          alt="Small LLM"
          className={css.leftImage}
        />
        <img
          src={LightBulbIcon}
          alt="Big LLM"
          className={css.rightImage}
        />

        <Switch.Thumb className={css.SwitchThumb}/>
      </Switch.Root>
    </div>
  </form>
);

